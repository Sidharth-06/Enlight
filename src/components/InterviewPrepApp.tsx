"use client";

import {
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Lightbulb,
  MessageSquare,
  Play,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  History,
  Pause,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Download,
  AlertCircle,
  Mic,
  Star,
  Flag,
  Sun,
  Moon
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { evaluateAnswer, isSubstantive } from "@/lib/evaluation";
import { buildQuestionBank, selectQuestions } from "@/lib/questions";
import { AnswerRecord, DifficultyLevel, InterviewType, Persona, Profile, Question, SessionStatus, Feedback } from "@/lib/types";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";

const interviewTypes: InterviewType[] = [
  "Technical_Coding",
  "Technical_System_Design",
  "Behavioral",
  "Situational",
  "HR",
];
const difficulties: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];
const personas: Persona[] = ["friendly", "neutral", "challenging"];

const defaultProfile: Profile = {
  name: "",
  role: "Software Engineer",
  difficulty: "Intermediate",
  preferredTypes: ["Technical_Coding", "Behavioral"],
  persona: "friendly",
  timedMode: false,
};

type PausedSession = {
  profile: Profile;
  plan: Question[];
  index: number;
  records: AnswerRecord[];
  questionCount: number;
  averageScore: number;
  timeRemaining?: number;
};

const codingLanguages = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "Go", value: "go" },
];

export function InterviewPrepApp() {
  const bank = useMemo(() => buildQuestionBank(), []);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [questionCount, setQuestionCount] = useState(5);
  const [status, setStatus] = useState<SessionStatus>("setup");
  const [plan, setPlan] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [warning, setWarning] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [coachSource, setCoachSource] = useState<"groq" | "local-fallback" | "idle">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "local">("idle");

  // Favorites & Flags states
  const [starredQuestions, setStarredQuestions] = useState<string[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Monaco Editor States
  const [editorLanguage, setEditorLanguage] = useState("javascript");

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Intervention Modal states
  const [intervention, setIntervention] = useState<{
    type: "elaboration" | "missing_result";
    feedback: Feedback;
  } | null>(null);

  // Follow-up conversation states
  const [isAnsweringFollowUp, setIsAnsweringFollowUp] = useState(false);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpHistory, setFollowUpHistory] = useState<Array<{
    question: string;
    answer: string;
    feedback: Feedback;
    responseSeconds: number;
  }>>([]);
  const [currentFollowUpFeedback, setCurrentFollowUpFeedback] = useState<Feedback | null>(null);

  // Model answer states
  const [isModelAnswerRevealed, setIsModelAnswerRevealed] = useState(false);

  // Streak/Adaptation Alert states
  const [difficultyAlert, setDifficultyAlert] = useState<{
    direction: "up" | "down";
    targetLevel: DifficultyLevel;
  } | null>(null);

  // Paused session cache check
  const [pausedSessionCache, setPausedSessionCache] = useState<PausedSession | null>(null);

  // History page sessions list state
  const [historySessions, setHistorySessions] = useState<any[]>([]);

  const currentQuestion = plan[index];
  const currentRecord = records[records.length - 1];
  const averageScore = records.length
    ? records.reduce((sum, record) => sum + record.feedback.score, 0) / records.length
    : 0;

  // Load profile, history, and paused session from local cache on mount
  useEffect(() => {
    const savedProfile = window.localStorage.getItem("interview-prep-profile");
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile) as Profile);
      } catch (e) {
        console.error("Error loading profile");
      }
    }

    const savedPaused = window.localStorage.getItem("interview-paused-session");
    if (savedPaused) {
      try {
        setPausedSessionCache(JSON.parse(savedPaused) as PausedSession);
      } catch (e) {
        console.error("Error loading paused session");
      }
    }

    // Load Favorites & Flags
    const savedFavorites = window.localStorage.getItem("interview-prep-favorites");
    if (savedFavorites) {
      try {
        setStarredQuestions(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Error loading favorites");
      }
    }

    const savedFlags = window.localStorage.getItem("interview-prep-flags");
    if (savedFlags) {
      try {
        setFlaggedQuestions(JSON.parse(savedFlags));
      } catch (e) {
        console.error("Error loading flags");
      }
    }

    // Load theme setting
    const savedTheme = window.localStorage.getItem("interview-prep-theme") as "light" | "dark" | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }

    loadLocalHistory();
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem("interview-prep-theme", nextTheme);
  }

  function loadLocalHistory() {
    const savedSessions = window.localStorage.getItem("interview-prep-history");
    if (savedSessions) {
      try {
        setHistorySessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Error loading local history");
      }
    }
  }

  // Handle active countdown timer logic
  useEffect(() => {
    if (status === "active" && profile.timedMode && timeRemaining !== null) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(timerRef.current!);
            // Auto submit answer when timer expires
            triggerAutoSubmit();
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, timeRemaining, profile.timedMode]);

  function triggerAutoSubmit() {
    setWarning("Time expired! Your answer has been automatically evaluated.");
    submitAnswer(true); // Force bypass validation
  }

  function extendTime() {
    if (timeRemaining !== null) {
      setTimeRemaining(timeRemaining + 300); // Add 5 additional minutes
    }
  }

  function updateProfile(next: Profile) {
    setProfile(next);
    window.localStorage.setItem("interview-prep-profile", JSON.stringify(next));
  }

  // Auto save after every single answer submission to satisfy interrupted session requirements
  function triggerSubmissionBackup(updatedRecords: AnswerRecord[]) {
    const backupState: PausedSession = {
      profile,
      plan,
      index: index + 1, // Prepare resume state to start from next question
      records: updatedRecords,
      questionCount,
      averageScore: updatedRecords.length
        ? updatedRecords.reduce((sum, r) => sum + r.feedback.score, 0) / updatedRecords.length
        : 0,
      timeRemaining: profile.timedMode ? 180 : undefined,
    };
    window.localStorage.setItem("interview-paused-session", JSON.stringify(backupState));
  }

  function startSession(customPlan?: Question[], loadedIndex?: number, loadedRecords?: AnswerRecord[], loadedTimeRemaining?: number) {
    if (!profile.role.trim()) {
      setWarning("Add a target role before starting.");
      return;
    }

    if (!profile.preferredTypes.length) {
      setWarning("Choose at least one interview type.");
      return;
    }

    if (customPlan) {
      // Resuming a paused session
      setPlan(customPlan);
      setIndex(loadedIndex ?? 0);
      setRecords(loadedRecords ?? []);
      setAnswer("");
      setHintsUsed(0);
      setIsAnsweringFollowUp(false);
      setFollowUpHistory([]);
      setIsModelAnswerRevealed(false);
      if (profile.timedMode) {
        setTimeRemaining(loadedTimeRemaining ?? 180);
      }
      setPausedSessionCache(null);
      window.localStorage.removeItem("interview-paused-session");
    } else {
      // New session
      const nextPlan = selectQuestions(
        bank,
        profile.preferredTypes,
        profile.difficulty,
        questionCount,
        profile.role,
        starredQuestions,
        flaggedQuestions,
        onlyFavorites
      );
      
      if (nextPlan.length === 0) {
        setWarning("No matching questions found! Try checking more types or disabling Favorites Only.");
        return;
      }

      setPlan(nextPlan);
      setIndex(0);
      setAnswer("");
      setRecords([]);
      setHintsUsed(0);
      setIsAnsweringFollowUp(false);
      setFollowUpHistory([]);
      setIsModelAnswerRevealed(false);
      if (profile.timedMode) {
        setTimeRemaining(180); // 3 minutes default count down
      }
      setStartedAt(Date.now());
    }

    setWarning("");
    setStatus("active");
  }

  function toggleType(type: InterviewType) {
    const exists = profile.preferredTypes.includes(type);
    const preferredTypes = exists
      ? profile.preferredTypes.filter((item) => item !== type)
      : [...profile.preferredTypes, type];
    updateProfile({ ...profile, preferredTypes });
  }

  function requestHint() {
    if (!currentQuestion || hintsUsed >= 3) return;
    setHintsUsed(hintsUsed + 1);
  }

  // Model Answer Reveal Check and cap score at 5/10
  function revealModelAnswer() {
    setIsModelAnswerRevealed(true);
    // Provide a starting value in the IDE answer from model if empty
    if (!answer.trim() && currentQuestion.type === "Technical_Coding") {
      setAnswer(`// Write your approach here:\n`);
    }
    setWarning("Model answer revealed! Scoring for this question is now capped at 5/10.");
  }

  // Question favoriting and flagging triggers
  function toggleFavorite(id: string) {
    const next = starredQuestions.includes(id)
      ? starredQuestions.filter((item) => item !== id)
      : [...starredQuestions, id];
    setStarredQuestions(next);
    window.localStorage.setItem("interview-prep-favorites", JSON.stringify(next));
  }

  function flagQuestion(id: string) {
    const next = [...flaggedQuestions, id];
    setFlaggedQuestions(next);
    window.localStorage.setItem("interview-prep-flags", JSON.stringify(next));
    setWarning("Question flagged as poor quality and permanently excluded from future plans!");

    // Instantly skip this question
    const nextIndex = index + 1;
    if (nextIndex >= plan.length) {
      setStatus("summary");
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setIndex(nextIndex);
      setAnswer("");
      setHintsUsed(0);
      setIsAnsweringFollowUp(false);
      setFollowUpHistory([]);
      setIsModelAnswerRevealed(false);
      if (profile.timedMode) {
        setTimeRemaining(180);
      }
      setStartedAt(Date.now());
    }
  }

  // Intercepting behavioral and short inputs locally before submitting
  async function handleAnswerSubmit() {
    if (!currentQuestion) return;

    if (!isSubstantive(answer)) {
      setWarning("Your answer needs a little more substance before feedback can be generated.");
      return;
    }

    // Run a local quick validation to check word limits and STAR constraints
    const localResult = evaluateAnswer(currentQuestion, answer, hintsUsed, profile.persona);

    // If there is code syntax error, prompt user immediately
    if (localResult.syntaxError) {
      setWarning(localResult.syntaxError);
      return;
    }

    // Behavioral warnings
    if (currentQuestion.type === "Behavioral" && (localResult.needsElaboration || localResult.missingResult)) {
      setIntervention({
        type: localResult.needsElaboration ? "elaboration" : "missing_result",
        feedback: localResult,
      });
      return;
    }

    // Proceed to submit normal evaluation
    await submitAnswer();
  }

  async function submitAnswer(bypassIntervention = false) {
    setIsEvaluating(true);
    setIntervention(null);
    const submittedAt = Date.now();
    const localFeedback = evaluateAnswer(currentQuestion, answer, hintsUsed, profile.persona);

    // Force score cap if model answer is revealed
    if (isModelAnswerRevealed) {
      localFeedback.score = Math.min(5, localFeedback.score);
    }

    let feedback = localFeedback;
    let source: "groq" | "local-fallback" = "local-fallback";

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          answer,
          hintsUsed,
          persona: profile.persona,
          history: followUpHistory.map((t) => ({
            question: t.question,
            answer: t.answer,
            feedback: t.feedback,
          })),
        }),
      });
      const payload = (await response.json()) as {
        feedback?: typeof localFeedback;
        source?: "groq" | "local-fallback";
      };

      if (payload.feedback) {
        feedback = payload.feedback;
        if (isModelAnswerRevealed) {
          feedback.score = Math.min(5, feedback.score);
        }
        source = payload.source ?? "local-fallback";
      }
    } catch (e) {
      feedback = localFeedback;
    }

    const record: AnswerRecord = {
      question: currentQuestion,
      answer,
      feedback,
      hintsUsed,
      responseSeconds: Math.round((submittedAt - startedAt) / 1000),
      answeredAt: new Date().toISOString(),
      isAssisted: isModelAnswerRevealed,
      followUpsAnswered: [],
    };

    const nextRecords = [...records, record];
    setRecords(nextRecords);
    setCoachSource(source);
    setIsEvaluating(false);
    setWarning("");

    // Back up state automatically after every submission to preserve interruption progress
    triggerSubmissionBackup(nextRecords);

    // Conversational Follow-Up Trigger logic
    const score = feedback.score;
    const policy = feedback.followUpPolicy; // Offer | Auto | Optional

    if (policy === "Auto") {
      // Auto trigger follow-up loops (up to 3 times)
      triggerFollowUp(feedback.followUpQuestion);
    } else if (policy === "Offer") {
      setFollowUpPrompt(feedback.followUpQuestion);
    }
  }

  function triggerFollowUp(q: string) {
    setFollowUpAnswer("");
    setIsAnsweringFollowUp(true);
    setFollowUpPrompt(q);
    setCurrentFollowUpFeedback(null);
    if (profile.timedMode) {
      setTimeRemaining(120); // 2 minutes for follow-up
    }
  }

  async function submitFollowUpAnswer() {
    if (!followUpAnswer.trim()) return;

    setIsEvaluating(true);
    const submittedAt = Date.now();
    const localFeedback = evaluateAnswer(currentQuestion, followUpAnswer, 0, profile.persona);
    let feedback = localFeedback;

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: {
            ...currentQuestion,
            prompt: followUpPrompt,
          },
          answer: followUpAnswer,
          hintsUsed: 0,
          persona: profile.persona,
          history: [
            ...followUpHistory,
            {
              question: currentQuestion.prompt,
              answer: answer,
              feedback: currentRecord ? currentRecord.feedback : localFeedback,
            },
          ].map((t) => ({
            question: t.question,
            answer: t.answer,
            feedback: t.feedback,
          })),
        }),
      });

      const payload = (await response.json()) as { feedback?: typeof localFeedback };
      if (payload.feedback) feedback = payload.feedback;
    } catch (e) {
      feedback = localFeedback;
    }

    const nextHistory = [
      ...followUpHistory,
      {
        question: followUpPrompt,
        answer: followUpAnswer,
        feedback: feedback,
        responseSeconds: Math.round((submittedAt - startedAt) / 1000),
      },
    ];

    setFollowUpHistory(nextHistory);
    setCurrentFollowUpFeedback(feedback);
    setIsEvaluating(false);

    // Update the last active record to include this follow up thread
    const updatedRecords = [...records];
    if (updatedRecords.length > 0) {
      updatedRecords[updatedRecords.length - 1] = {
        ...updatedRecords[updatedRecords.length - 1],
        followUpsAnswered: nextHistory,
      };
      setRecords(updatedRecords);
      // Update state backup
      triggerSubmissionBackup(updatedRecords);
    }

    // Limit to 3 follow ups max
    if (nextHistory.length < 3 && (feedback.followUpPolicy === "Auto" || feedback.followUpPolicy === "Offer")) {
      setFollowUpPrompt(feedback.followUpQuestion);
      setFollowUpAnswer("");
    } else {
      // Completed follow ups loop
      setIsAnsweringFollowUp(false);
      setFollowUpPrompt("");
    }
  }

  function skipFollowUp() {
    setIsAnsweringFollowUp(false);
    setFollowUpPrompt("");
    nextQuestion();
  }

  function nextQuestion() {
    // 5. Difficulty Adaptation (Score streak checking)
    const consecutiveRecords = records.slice(-3);
    if (consecutiveRecords.length === 3) {
      const scores = consecutiveRecords.map((r) => r.feedback.score);
      const isStreakUp = scores.every((s) => s >= 8);
      const isStreakDown = scores.every((s) => s <= 4);

      if (isStreakUp && profile.difficulty !== "Advanced") {
        setDifficultyAlert({
          direction: "up",
          targetLevel: profile.difficulty === "Beginner" ? "Intermediate" : "Advanced",
        });
        return;
      }
      if (isStreakDown && profile.difficulty !== "Beginner") {
        setDifficultyAlert({
          direction: "down",
          targetLevel: profile.difficulty === "Advanced" ? "Intermediate" : "Beginner",
        });
        return;
      }
    }

    proceedToNextQuestion();
  }

  function proceedToNextQuestion() {
    setDifficultyAlert(null);
    const nextIndex = index + 1;
    if (nextIndex >= plan.length) {
      setStatus("summary");
      if (timerRef.current) clearInterval(timerRef.current);
      // Remove interruption backup as session is completed
      window.localStorage.removeItem("interview-paused-session");
      return;
    }

    setIndex(nextIndex);
    setAnswer("");
    setHintsUsed(0);
    setIsAnsweringFollowUp(false);
    setFollowUpHistory([]);
    setIsModelAnswerRevealed(false);
    if (profile.timedMode) {
      setTimeRemaining(180);
    }
    setStartedAt(Date.now());
    setWarning("");
  }

  function changeDifficultyFromStreak(accept: boolean) {
    if (accept && difficultyAlert) {
      const nextDiff = difficultyAlert.targetLevel;
      updateProfile({ ...profile, difficulty: nextDiff });
      setWarning(`Difficulty dynamically level up: switched to ${nextDiff}!`);
    }
    setDifficultyAlert(null);
    proceedToNextQuestion();
  }

  // Session Pause & Resume Implementation
  function pauseSession() {
    const pausedState: PausedSession = {
      profile,
      plan,
      index,
      records,
      questionCount,
      averageScore,
      timeRemaining: timeRemaining ?? undefined,
    };
    window.localStorage.setItem("interview-paused-session", JSON.stringify(pausedState));
    setPausedSessionCache(pausedState);
    resetAll();
    setWarning("Session paused and cached safely! You can resume it anytime from the Setup page.");
  }

  function resetAll() {
    setStatus("setup");
    setPlan([]);
    setIndex(0);
    setAnswer("");
    setRecords([]);
    setHintsUsed(0);
    setIsAnsweringFollowUp(false);
    setFollowUpHistory([]);
    setIsModelAnswerRevealed(false);
    setWarning("");
    setCoachSource("idle");
    setSaveState("idle");
    setTimeRemaining(null);
    if (timerRef.current) clearInterval(timerRef.current);
    // Reload local history
    loadLocalHistory();
  }

  // Save session metrics to local cache or Supabase database
  async function saveSummary() {
    setSaveState("saving");
    const totalHints = records.reduce((sum, record) => sum + record.hintsUsed, 0);

    const sessionPayload = {
      id: crypto.randomUUID(),
      userKey: profile.name || profile.role,
      profile,
      records,
      averageScore,
      totalHints,
      createdAt: new Date().toISOString(),
    };

    // 1. Save to local storage cache so it persists even if DB config is absent
    const currentHist = [...historySessions];
    currentHist.unshift(sessionPayload);
    window.localStorage.setItem("interview-prep-history", JSON.stringify(currentHist));
    setHistorySessions(currentHist);

    // 2. Try to save to Supabase
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      });
      const payload = (await response.json()) as { saved?: boolean };
      setSaveState(payload.saved ? "saved" : "local");
    } catch {
      setSaveState("local");
    }
  }

  // Markdown summaries report downloader
  function exportSummaryAsMarkdown(session: any = null) {
    const targetSession = session ?? {
      profile,
      records,
      averageScore,
      createdAt: new Date().toISOString(),
    };

    let md = `# Interview Session Record
**Date:** ${new Date(targetSession.createdAt).toLocaleDateString()}
**Target Role:** ${targetSession.profile.role}
**Interviewer Style:** ${targetSession.profile.persona}
**Difficulty Profile:** ${targetSession.profile.difficulty}
**Average Performance Score:** ${targetSession.averageScore.toFixed(1)} / 10

---

## Question Records
`;

    targetSession.records.forEach((rec: any, idx: number) => {
      // Salary figures confidentiality scrubbing check
      let scrubbedAnswer = rec.answer;
      if (rec.question.topic === "Salary Expectations") {
        scrubbedAnswer = rec.answer.replace(/\$?\d{2,3}(?:,?\d{3})*(?:\s*k)?/gi, "[CONFIDENTIAL COMPENSATION DETAILS]");
      }

      md += `
### Q${idx + 1}: ${rec.question.topic} (${rec.question.type.replace("_", " ")})
- **Prompt:** ${rec.question.prompt}
- **Score:** ${rec.feedback.score} / 10
- **Hints Used:** ${rec.hintsUsed} / 3
- **Answered Assisted (Model Answer Revealed):** ${rec.isAssisted ? "Yes" : "No"}
- **Response Time:** ${rec.responseSeconds} seconds

**Your Answer:**
\`\`\`
${scrubbedAnswer}
\`\`\`

**Strengths:**
${rec.feedback.strengths.map((s: string) => `- ${s}`).join("\n")}

**Improvements Needed:**
${rec.feedback.improvements.map((i: string) => `- ${i}`).join("\n")}

**Suggestions:**
${rec.feedback.suggestions.map((s: string) => `- ${s}`).join("\n")}
`;

      if (rec.followUpsAnswered && rec.followUpsAnswered.length > 0) {
        md += `\n**Conversational Follow-Up Threads:**\n`;
        rec.followUpsAnswered.forEach((f: any, fIdx: number) => {
          md += `
* **Follow-Up Q${fIdx + 1}:** ${f.question}
* **Answer:** ${f.answer}
* **Follow-Up Score:** ${f.feedback.score} / 10
`;
        });
      }

      md += `\n---\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-session-${targetSession.profile.role.replaceAll(" ", "-").toLowerCase()}-${new Date(targetSession.createdAt).toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <aside className="rail" aria-label="Session navigation">
        <div className="brand-mark">
          <Bot size={24} aria-hidden="true" />
        </div>
        <IconButton label="Setup" active={status === "setup"} icon={<Settings size={18} />} onClick={() => setStatus("setup")} />
        <IconButton label="Practice" active={status === "active"} icon={<MessageSquare size={18} />} onClick={() => plan.length && setStatus("active")} />
        <IconButton label="Summary" active={status === "summary"} icon={<BarChart3 size={18} />} onClick={() => records.length && setStatus("summary")} />
        <IconButton label="Saved History" active={status === "history"} icon={<History size={18} />} onClick={() => setStatus("history")} />
        
        <div className="rail-bottom">
          <button
            className="theme-switch-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Interview Prep Bot</p>
            <h1>
              {status === "active"
                ? `Practice: Q${index + 1}/${plan.length}`
                : status === "summary"
                  ? "Session Summary"
                  : status === "history"
                    ? "Saved Progress History"
                    : "Session Setup"}
            </h1>
          </div>
          <div className="topbar-metrics">
            <Metric label="Coach Engine" value={coachSource === "groq" ? "Groq AI" : coachSource === "local-fallback" ? "Local fallback" : "Ready"} />
            <Metric label="Difficulty" value={profile.difficulty} />
            <Metric label="Avg Performance" value={averageScore ? `${averageScore.toFixed(1)}/10` : "-"} />
          </div>
        </header>

        {warning && (
          <div className="warning-banner" style={{ display: 'flex', gap: '8px', padding: '12px', background: '#fdf2f2', borderLeft: '4px solid #de350b', borderRadius: '8px', marginBottom: '18px', color: '#de350b', fontWeight: 'bold', fontSize: '14px', alignItems: 'center' }}>
            <AlertCircle size={18} />
            <span>{warning}</span>
          </div>
        )}

        {status === "setup" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {pausedSessionCache && (
              <div style={{ padding: '16px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--accent-strong)' }}>Active Session Recovered</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text)' }}>
                    You have a cached <strong>{pausedSessionCache.profile.role}</strong> session with {pausedSessionCache.records.length}/{pausedSessionCache.plan.length} questions completed.
                  </p>
                </div>
                <button className="primary-action" style={{ width: 'auto', minWidth: '150px' }} onClick={() => startSession(pausedSessionCache.plan, pausedSessionCache.index, pausedSessionCache.records, pausedSessionCache.timeRemaining)}>
                  Resume Session
                </button>
              </div>
            )}
            
            <SetupView
              profile={profile}
              questionCount={questionCount}
              warning={warning}
              starredQuestions={starredQuestions}
              onlyFavorites={onlyFavorites}
              onOnlyFavoritesChange={setOnlyFavorites}
              onProfileChange={updateProfile}
              onCountChange={setQuestionCount}
              onTypeToggle={toggleType}
              onStart={() => startSession()}
            />
          </div>
        )}

        {status === "active" && currentQuestion && (
          <div style={{ position: 'relative' }}>
            {/* Timer Strip if timed mode */}
            {profile.timedMode && timeRemaining !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: timeRemaining < 30 ? '#fdf2f2' : '#f0fdf4', border: '1px solid ' + (timeRemaining < 30 ? '#de350b' : '#10b981'), borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: timeRemaining < 30 ? '#de350b' : '#047857', fontWeight: 'bold' }}>
                  <Clock className={timeRemaining < 30 ? "animate-pulse" : ""} size={18} />
                  <span>
                    Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <button className="secondary-action" style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }} onClick={extendTime} disabled={isEvaluating}>
                  +5 min
                </button>
              </div>
            )}

            {/* Streak Adaptation Modal */}
            {difficultyAlert && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.95)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '24px' }}>
                <div className="panel" style={{ maxWidth: '480px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                  <Brain size={44} style={{ color: 'var(--accent)' }} />
                  <h2>Dynamic Difficulty Adjustment</h2>
                  <p style={{ color: 'var(--muted)' }}>
                    {difficultyAlert.direction === "up"
                      ? "Incredible performance! You got 3 perfect answers in a row. Would you like to raise the difficulty to challenge yourself?"
                      : "This is a demanding set of questions. Would you like to lower the difficulty level for upcoming questions to focus on fundamentals?"}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button className="secondary-action" style={{ flex: 1 }} onClick={() => changeDifficultyFromStreak(false)}>
                      Keep {profile.difficulty}
                    </button>
                    <button className="primary-action" style={{ flex: 1 }} onClick={() => changeDifficultyFromStreak(true)}>
                      Adjust to {difficultyAlert.targetLevel}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Deliberation Modal Interventions */}
            {intervention && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.95)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '24px' }}>
                <div className="panel" style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--warning)' }}>
                    <AlertTriangle size={28} />
                    <h2>
                      {intervention.type === "elaboration" ? "Short Answer Warning" : "Missing Answer Component"}
                    </h2>
                  </div>
                  <p style={{ color: 'var(--muted)', margin: 0 }}>
                    {intervention.type === "elaboration"
                      ? "Behavioral answers are strongest when descriptive and detailed (ideally over 100 words). Your answer is currently short."
                      : "Behavioral prompts perform best under the STAR framework. Your response appears to be missing a clear, measurable Result component."}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                    <button className="secondary-action" style={{ flex: 1 }} onClick={() => { setIntervention(null); submitAnswer(true); }}>
                      Score As-Is
                    </button>
                    <button className="primary-action" style={{ flex: 1 }} onClick={() => setIntervention(null)}>
                      Elaborate / Edit Answer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Split Screen Model Answer Reveal Layout */}
            {isModelAnswerRevealed ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
                <div className="panel" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--muted)' }}>Your Response</strong>
                  </div>
                  {currentQuestion.type === "Technical_Coding" ? (
                    <div style={{ flex: 1, border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                      <Editor
                        height="360px"
                        language={editorLanguage}
                        value={answer}
                        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 13,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  ) : (
                    <textarea value={answer} readOnly style={{ flex: 1, background: 'var(--surface-muted)', border: 'none', resize: 'none' }} />
                  )}
                </div>
                <div className="panel" style={{ minHeight: '440px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '12px', color: 'var(--accent-strong)' }}>
                    <strong>Recommended Model Answer</strong>
                    <span style={{ fontSize: '11px', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '99px', fontWeight: 'bold' }}>Capped 5/10 Max</span>
                  </div>
                  {currentQuestion.type === "Technical_Coding" ? (
                    <div style={{ flex: 1, border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                      <Editor
                        height="360px"
                        language={editorLanguage}
                        value={currentQuestion.modelAnswer}
                        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 13,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px', background: '#f5faf8', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{currentQuestion.modelAnswer}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button className="secondary-action" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={pauseSession} disabled={isEvaluating}>
                <Pause size={14} /> Pause & Cache Session
              </button>
              
              {!currentRecord && !isModelAnswerRevealed && (
                <button className="secondary-action" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', borderColor: '#fde68a' }} onClick={revealModelAnswer} disabled={isEvaluating}>
                  <BookOpen size={14} /> Reveal Model Answer
                </button>
              )}
            </div>

            <PracticeView
              question={currentQuestion}
              answer={answer}
              warning={warning}
              hintsUsed={hintsUsed}
              record={currentRecord?.question.id === currentQuestion.id ? currentRecord : undefined}
              isEvaluating={isEvaluating}
              starredQuestions={starredQuestions}
              onToggleFavorite={toggleFavorite}
              onFlagQuestion={flagQuestion}
              onAnswerChange={setAnswer}
              onHint={requestHint}
              onSubmit={handleAnswerSubmit}
              onNext={nextQuestion}
              isAnsweringFollowUp={isAnsweringFollowUp}
              followUpPrompt={followUpPrompt}
              followUpAnswer={followUpAnswer}
              onFollowUpAnswerChange={setFollowUpAnswer}
              onFollowUpSubmit={submitFollowUpAnswer}
              onFollowUpSkip={skipFollowUp}
              followUpHistory={followUpHistory}
              currentFollowUpFeedback={currentFollowUpFeedback}
              editorLanguage={editorLanguage}
              onEditorLanguageChange={setEditorLanguage}
              theme={theme}
            />
          </div>
        )}

        {status === "summary" && (
          <SummaryView
            records={records}
            profile={profile}
            averageScore={averageScore}
            saveState={saveState}
            onSave={saveSummary}
            onReset={resetAll}
            onExport={() => exportSummaryAsMarkdown()}
          />
        )}

        {status === "history" && (
          <HistoryView
            sessions={historySessions}
            onReset={resetAll}
            onExport={exportSummaryAsMarkdown}
            onClear={() => {
              window.localStorage.removeItem("interview-prep-history");
              setHistorySessions([]);
            }}
          />
        )}
      </section>
    </main>
  );
}

function SetupView({
  profile,
  questionCount,
  warning,
  starredQuestions,
  onlyFavorites,
  onOnlyFavoritesChange,
  onProfileChange,
  onCountChange,
  onTypeToggle,
  onStart,
}: {
  profile: Profile;
  questionCount: number;
  warning: string;
  starredQuestions: string[];
  onlyFavorites: boolean;
  onOnlyFavoritesChange: (val: boolean) => void;
  onProfileChange: (profile: Profile) => void;
  onCountChange: (count: number) => void;
  onTypeToggle: (type: InterviewType) => void;
  onStart: () => void;
}) {
  return (
    <div className="setup-grid">
      <section className="panel profile-panel">
        <div className="panel-title">
          <Brain size={19} aria-hidden="true" />
          <h2>Profile & Constraints</h2>
        </div>
        <label>
          Display name
          <input value={profile.name} onChange={(event) => onProfileChange({ ...profile, name: event.target.value })} placeholder="Optional" />
        </label>
        <label>
          Target role
          <input value={profile.role} maxLength={100} onChange={(event) => onProfileChange({ ...profile, role: event.target.value })} />
        </label>
        <div className="field-row">
          <label>
            Difficulty
            <select value={profile.difficulty} onChange={(event) => onProfileChange({ ...profile, difficulty: event.target.value as DifficultyLevel })}>
              {difficulties.map((difficulty) => (
                <option key={difficulty}>{difficulty}</option>
              ))}
            </select>
          </label>
          <label>
            Persona
            <select value={profile.persona} onChange={(event) => onProfileChange({ ...profile, persona: event.target.value as Persona })}>
              {personas.map((persona) => (
                <option key={persona}>{persona}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row">
          <label>
            Questions (Max 30)
            <input
              type="number"
              min={1}
              max={30}
              value={questionCount}
              onChange={(event) => onCountChange(Math.max(1, Math.min(30, Number(event.target.value))))}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span>Timed Mode (3 min Limit)</span>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={profile.timedMode ?? false}
                onChange={(event) => onProfileChange({ ...profile, timedMode: event.target.checked })}
                style={{ width: '20px', height: '20px', marginRight: '8px', minHeight: 'auto', cursor: 'pointer' }}
              />
              <span>Enable Timer</span>
            </div>
          </label>
        </div>
        
        {/* Practice Favorites Toggle */}
        <div className="field-row" style={{ marginTop: '8px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span>Practice Favorites Only</span>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={onlyFavorites}
                disabled={starredQuestions.length === 0}
                onChange={(event) => onOnlyFavoritesChange(event.target.checked)}
                style={{ width: '20px', height: '20px', marginRight: '8px', minHeight: 'auto', cursor: 'pointer' }}
              />
              <span>Starred Questions ({starredQuestions.length} saved)</span>
            </div>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <Sparkles size={19} aria-hidden="true" />
          <h2>Interview Types</h2>
        </div>
        <div className="integration-row" aria-label="Configured platform capabilities">
          <span>Groq coach</span>
          <span>Supabase memory</span>
          <span>STAR verification</span>
        </div>
        <div className="type-grid">
          {interviewTypes.map((type) => (
            <button
              key={type}
              className={`type-tile ${profile.preferredTypes.includes(type) ? "selected" : ""}`}
              onClick={() => onTypeToggle(type)}
            >
              <span>{type.replaceAll("_", " ")}</span>
              {profile.preferredTypes.includes(type) && <CheckCircle2 size={18} aria-hidden="true" />}
            </button>
          ))}
        </div>
        {warning && <p className="warning">{warning}</p>}
        <button className="primary-action" style={{ marginTop: '18px' }} onClick={onStart}>
          <Play size={18} aria-hidden="true" />
          Start Practice Session
        </button>
      </section>
    </div>
  );
}

function PracticeView({
  question,
  answer,
  warning,
  hintsUsed,
  record,
  isEvaluating,
  starredQuestions,
  onToggleFavorite,
  onFlagQuestion,
  onAnswerChange,
  onHint,
  onSubmit,
  onNext,
  isAnsweringFollowUp,
  followUpPrompt,
  followUpAnswer,
  onFollowUpAnswerChange,
  onFollowUpSubmit,
  onFollowUpSkip,
  followUpHistory,
  currentFollowUpFeedback,
  editorLanguage,
  onEditorLanguageChange,
  theme,
}: {
  question: Question;
  answer: string;
  warning: string;
  hintsUsed: number;
  record?: AnswerRecord;
  isEvaluating: boolean;
  starredQuestions: string[];
  onToggleFavorite: (id: string) => void;
  onFlagQuestion: (id: string) => void;
  onAnswerChange: (answer: string) => void;
  onHint: () => void;
  onSubmit: () => void;
  onNext: () => void;
  isAnsweringFollowUp: boolean;
  followUpPrompt: string;
  followUpAnswer: string;
  onFollowUpAnswerChange: (a: string) => void;
  onFollowUpSubmit: () => void;
  onFollowUpSkip: () => void;
  followUpHistory: any[];
  currentFollowUpFeedback: Feedback | null;
  editorLanguage: string;
  onEditorLanguageChange: (lang: string) => void;
  theme: "light" | "dark";
}) {
  const isCoding = question.type === "Technical_Coding";
  const isStarred = starredQuestions.includes(question.id);

  // Speech recognition elements
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null); // For local fallback

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Show Mic ONLY for textual responses (Behavioral, Situational, HR) and not for algos or tech design logic!
  const showMic = !isCoding && question.type !== "Technical_System_Design" && typeof window !== 'undefined';

  async function toggleListening() {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      audioChunksRef.current = [];
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("MediaDevices not supported");
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = { mimeType: "audio/webm" };
        let mediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch {
          mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const mimeType = mediaRecorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          stream.getTracks().forEach((track) => track.stop());

          setIsListening(false);

          console.log(`[Client] Audio recording stopped. MimeType: ${mimeType}, Size: ${audioBlob.size} bytes`);

          if (audioBlob.size === 0) {
            console.warn("[Client] Audio recording is empty (0 bytes). Skipping cloud transcription.");
            toast.error("No audio was recorded. Please check your mic and try speaking again.");
            return;
          }
          
          // Extract a clean file extension from the mime type (e.g. "audio/webm;codecs=opus" -> "webm")
          const cleanExtension = (mimeType.split(";")[0] || "audio/webm").split("/")[1] || "webm";
          
          const formData = new FormData();
          formData.append("file", audioBlob, `speech.${cleanExtension}`);

          try {
            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            });
            
            let payload: { text?: string; error?: string } = {};
            try {
              payload = await res.json();
            } catch (jsonErr) {
              console.error("Failed to parse transcription API JSON response", jsonErr);
            }

            if (!res.ok) {
              throw new Error(payload.error || `Transcription API returned status ${res.status}`);
            }

            if (payload.error) {
              throw new Error(payload.error);
            }

            if (payload.text && payload.text.trim()) {
              onAnswerChange(answer ? answer + " " + payload.text.trim() : payload.text.trim());
            }
          } catch (err: any) {
            console.warn("Cloud transcription failed, falling back to local client recognition:", err.message || err);
            toast.error(err.message || "Cloud transcription failed.");
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(250);
        setIsListening(true);
      } catch (err) {
        console.log("MediaRecorder initialization failed, starting standard client SpeechRecognition...");
        
        const SpeechReg = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechReg) {
          alert("Your browser does not support audio dictation tools. Please use Chrome, Edge, or Safari.");
          return;
        }

        const recognition = new SpeechReg();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          onAnswerChange(answer ? answer + " " + transcript : transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }
    }
  }

  return (
    <div className="practice-grid">
      <section className="panel question-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="question-meta" style={{ marginBottom: 0 }}>
            <span>{question.type.replaceAll("_", " ")}</span>
            <span>{question.difficulty}</span>
            <span>{question.topic}</span>
          </div>
          
          {/* Favorites Star & Flag exclude controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onToggleFavorite(question.id)}
              disabled={isAnsweringFollowUp}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: isStarred ? '#eab308' : '#9ca3af',
                display: 'grid',
                placeItems: 'center'
              }}
              title={isStarred ? "Remove from Favorites" : "Add to Favorites"}
            >
              <Star size={20} fill={isStarred ? "#eab308" : "none"} />
            </button>
            <button
              onClick={() => onFlagQuestion(question.id)}
              disabled={isAnsweringFollowUp}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: '#9ca3af',
                display: 'grid',
                placeItems: 'center'
              }}
              title="Flag Question (Permanently Exclude)"
            >
              <Flag size={18} />
            </button>
          </div>
        </div>

        <h2>{question.prompt}</h2>
        {question.examples && <p className="example">{question.examples}</p>}
        
        {/* Technology constraints mapping for System Design */}
        {question.constraints && question.constraints.length > 0 && (
          <div style={{ margin: '12px 0', padding: '12px', background: '#fffbeb', borderLeft: '4px solid #d97706', borderRadius: '8px' }}>
            <strong style={{ color: '#b45309', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Active Tech Constraints:</strong>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#78350f' }}>
              {question.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rubric-strip" style={{ marginTop: 'auto' }}>
          <strong>Rubrics:</strong>
          {question.rubric.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="hint-box" style={{ marginTop: '12px' }}>
          <div className="hint-header">
            <Lightbulb size={18} aria-hidden="true" />
            <strong>Hints used: {hintsUsed}/3</strong>
          </div>
          {hintsUsed > 0 ? <p>{question.hints[hintsUsed - 1]}</p> : <p>Request a hint when you need a nudge. Each hint lowers the score ceiling by one.</p>}
          <button className="secondary-action" onClick={onHint} disabled={hintsUsed >= 3 || Boolean(record) || isAnsweringFollowUp}>
            <Lightbulb size={16} aria-hidden="true" />
            Hint
          </button>
        </div>
      </section>

      <section className="panel answer-panel" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Conversational follow-up loop screen */}
        {isAnsweringFollowUp ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--accent-strong)', marginBottom: '4px' }}>
                <Bot size={18} />
                <strong>Follow-Up Conversation</strong>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
                {followUpPrompt}
              </p>
            </div>

            {followUpHistory.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px', background: '#fafafa' }}>
                {followUpHistory.map((t, i) => (
                  <div key={i} style={{ fontSize: '12px' }}>
                    <div style={{ color: 'var(--muted)', fontWeight: 'bold' }}>Q: {t.question}</div>
                    <div style={{ color: 'var(--text)' }}>A: {t.answer}</div>
                    {t.feedback && <div style={{ color: 'var(--accent-strong)', fontWeight: 'bold' }}>Score: {t.feedback.score}/10</div>}
                  </div>
                ))}
              </div>
            )}

            <label style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              Your Response to Follow-Up
              <textarea value={followUpAnswer} onChange={(event) => onFollowUpAnswerChange(event.target.value)} disabled={isEvaluating} style={{ flex: 1, minHeight: '120px' }} />
            </label>

            {currentFollowUpFeedback && (
              <div className="score-line" style={{ padding: '8px 12px' }}>
                <strong>Follow-Up Score: {currentFollowUpFeedback.score}/10</strong>
                <span style={{ fontSize: '11px' }}>{currentFollowUpFeedback.followUpPolicy} Policy</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              <button className="secondary-action" style={{ flex: 1 }} onClick={onFollowUpSkip} disabled={isEvaluating}>
                Skip & Proceed
              </button>
              <button className="primary-action" style={{ flex: 1 }} onClick={onFollowUpSubmit} disabled={isEvaluating || !followUpAnswer.trim()}>
                {isEvaluating ? "Evaluating..." : "Submit Follow-Up"}
              </button>
            </div>
          </div>
        ) : (
          /* Normal main question answering workspace */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {isCoding ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--muted)' }}>Coding Workspace</strong>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Language:</span>
                    <select
                      value={editorLanguage}
                      onChange={(e) => onEditorLanguageChange(e.target.value)}
                      disabled={Boolean(record)}
                      style={{ width: 'auto', minHeight: '32px', padding: '4px 8px', fontSize: '12px', borderRadius: '6px' }}
                    >
                      {codingLanguages.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ flex: 1, border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden', minHeight: '260px' }}>
                  <Editor
                    height="100%"
                    language={editorLanguage}
                    value={answer}
                    theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                    onChange={(val) => onAnswerChange(val ?? "")}
                    options={{
                      readOnly: Boolean(record),
                      minimap: { enabled: false },
                      fontSize: 14,
                      automaticLayout: true,
                    }}
                    loading={<div style={{ padding: '16px', color: 'var(--muted)', fontSize: '13px' }}>Loading Coding IDE Environment...</div>}
                  />
                </div>
              </div>
            ) : (
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span>Answer</span>
                  {showMic && (
                    <div className="mic-pulse-container" style={{ display: 'inline-block', position: 'relative' }}>
                      {isListening && <div className="mic-ripple" />}
                      <button
                        className="secondary-action"
                        style={{
                          minHeight: '34px',
                          padding: '4px 14px',
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderColor: isListening ? 'var(--warning)' : 'var(--accent-soft)',
                          background: isListening ? 'var(--warning-soft)' : 'var(--surface)',
                          color: isListening ? 'var(--warning)' : 'var(--accent-strong)',
                          borderRadius: '8px',
                          position: 'relative',
                          zIndex: 2,
                        }}
                        onClick={toggleListening}
                        disabled={Boolean(record)}
                      >
                        <Mic size={14} className={isListening ? "animate-pulse" : ""} style={{ color: isListening ? 'var(--warning)' : 'inherit' }} />
                        <span>{isListening ? "Recording..." : "Dictate Response (Mic)"}</span>
                      </button>
                    </div>
                  )}
                </div>
                <textarea value={answer} onChange={(event) => onAnswerChange(event.target.value)} disabled={Boolean(record)} style={{ flex: 1 }} placeholder="State your approach, implementation, or STAR case details clearly..." />
              </label>
            )}
            
            {warning && <p className="warning">{warning}</p>}
            {!record ? (
              <button className="primary-action" onClick={onSubmit} disabled={isEvaluating}>
                <Save size={18} aria-hidden="true" />
                {isEvaluating ? "Evaluating Answer..." : "Submit Answer"}
              </button>
            ) : (
              <FeedbackPanel record={record} onNext={onNext} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FeedbackPanel({ record, onNext }: { record: AnswerRecord; onNext: () => void }) {
  // Check if they skipped conversational loop
  const hasFollowUps = record.followUpsAnswered && record.followUpsAnswered.length > 0;

  return (
    <div className="feedback-panel" style={{ overflowY: 'auto', maxHeight: '480px', paddingRight: '8px' }}>
      <div className="score-line">
        <strong>{record.feedback.score}/10</strong>
        <span>{record.feedback.followUpPolicy} Follow-Up</span>
      </div>
      <FeedbackList title="Strengths" items={record.feedback.strengths} />
      <FeedbackList title="Improvements Needed" items={record.feedback.improvements} />
      <FeedbackList title="Suggestions" items={record.feedback.suggestions} />
      {record.feedback.criticalGaps.length > 0 && <FeedbackList title="Critical Gaps" items={record.feedback.criticalGaps.map((gap) => gap.observation)} />}
      {record.feedback.minorImprovements.length > 0 && (
        <FeedbackList title="Minor Improvements" items={record.feedback.minorImprovements.map((gap) => gap.observation)} />
      )}
      
      {hasFollowUps && (
        <div style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', background: 'var(--surface-muted)', marginTop: '8px' }}>
          <strong style={{ color: 'var(--accent-strong)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>Completed Conversation Thread:</strong>
          {record.followUpsAnswered?.map((f, i) => (
            <div key={i} style={{ marginBottom: '8px', fontSize: '12px', borderBottom: i < record.followUpsAnswered!.length - 1 ? '1px solid var(--line)' : 'none', paddingBottom: '6px' }}>
              <div style={{ fontWeight: 'bold' }}>Follow-Up: {f.question}</div>
              <div style={{ color: 'var(--muted)' }}>Response: {f.answer}</div>
              <div style={{ color: 'var(--accent-strong)', fontWeight: 'bold' }}>Score: {f.feedback.score}/10</div>
            </div>
          ))}
        </div>
      )}

      <button className="primary-action" onClick={onNext} style={{ marginTop: '12px' }}>
        Next Question <ArrowRight size={16} />
      </button>
    </div>
  );
}

function SummaryView({
  records,
  profile,
  averageScore,
  saveState,
  onSave,
  onReset,
  onExport,
}: {
  records: AnswerRecord[];
  profile: Profile;
  averageScore: number;
  saveState: "idle" | "saving" | "saved" | "local";
  onSave: () => void;
  onReset: () => void;
  onExport: () => void;
}) {
  const totalHints = records.reduce((sum, record) => sum + record.hintsUsed, 0);
  const followUps = records.filter((record) => record.feedback.followUpPolicy !== "Optional").length;

  return (
    <section className="summary-layout">
      <div className="panel summary-hero">
        <p className="eyebrow">Target Role: {profile.role}</p>
        <h2>{averageScore.toFixed(1)} Average</h2>
        <div className="summary-metrics">
          <Metric label="Answered" value={String(records.length)} />
          <Metric label="Hints Used" value={String(totalHints)} />
          <Metric label="Follow-ups" value={String(followUps)} />
        </div>
        <button className="secondary-action full-width" onClick={onSave} disabled={saveState === "saving" || !records.length}>
          <Save size={18} aria-hidden="true" />
          {saveState === "saved"
            ? "Saved to Supabase"
            : saveState === "local"
              ? "Saved to Local Cache"
              : saveState === "saving"
                ? "Saving..."
                : "Save Session Progress"}
        </button>
        <button className="secondary-action full-width" onClick={onExport} disabled={!records.length} style={{ color: 'var(--accent-strong)', borderColor: 'var(--line)' }}>
          <Download size={18} aria-hidden="true" />
          Export to Markdown
        </button>
        <button className="primary-action" onClick={onReset}>
          <RotateCcw size={18} aria-hidden="true" />
          New Prep Session
        </button>
      </div>
      <div className="history-list">
        {records.map((record, recordIndex) => (
          <article className="history-item" key={record.question.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <span className="question-number">Q{recordIndex + 1}: {record.question.topic}</span>
                <h3 style={{ margin: 0 }}>{record.question.prompt.substring(0, 100)}...</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px' }}>{record.question.type.replaceAll("_", " ")} | Hints: {record.hintsUsed}/3</p>
              </div>
              <div className="history-meta">
                <strong>{record.feedback.score}/10</strong>
                <span>
                  <Clock size={14} aria-hidden="true" />
                  {record.responseSeconds}s
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Saved Progress History view component
function HistoryView({
  sessions,
  onReset,
  onExport,
  onClear,
}: {
  sessions: any[];
  onReset: () => void;
  onExport: (s: any) => void;
  onClear: () => void;
}) {
  // Compute improvement/decline trends if completed 3+ sessions of same role
  const trendsByRole = useMemo(() => {
    if (sessions.length < 3) return null;
    const roleStats: Record<string, number[]> = {};
    sessions.forEach((s) => {
      const r = s.profile.role;
      if (!roleStats[r]) roleStats[r] = [];
      roleStats[r].push(s.averageScore);
    });

    const calculated: Record<string, { delta: number; status: "improving" | "declining" | "stable" }> = {};
    Object.keys(roleStats).forEach((role) => {
      const scores = roleStats[role];
      if (scores.length >= 3) {
        // chronological ordering is from latest to oldest in array (we unshift them)
        const latest = scores[0];
        const oldest = scores[scores.length - 1];
        const delta = latest - oldest;
        calculated[role] = {
          delta,
          status: delta >= 2 ? "improving" : delta <= -2 ? "declining" : "stable",
        };
      }
    });
    return calculated;
  }, [sessions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {sessions.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Brain size={48} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
          <h2>No Saved Sessions Yet</h2>
          <p style={{ color: 'var(--muted)', maxWidth: '420px', margin: '8px auto 18px' }}>
            Complete practice sessions and click "Save Session Progress" to begin building your progress scoreboard and trend analytics.
          </p>
          <button className="primary-action" style={{ width: 'auto', margin: '0 auto' }} onClick={onReset}>
            Start First Session
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '18px' }}>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignContent: 'start' }}>
            <h2>History Analytics</h2>
            
            {/* Display calculated delta trend tags if 3+ sessions exist */}
            {trendsByRole && Object.keys(trendsByRole).length > 0 ? (
              <div style={{ padding: '12px', background: '#f5faf8', borderRadius: '8px', border: '1px solid var(--accent)' }}>
                <strong style={{ fontSize: '13px', color: 'var(--accent-strong)' }}>Active Performance Trends:</strong>
                {Object.keys(trendsByRole).map((role) => {
                  const t = trendsByRole[role];
                  return (
                    <div key={role} style={{ marginTop: '8px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{role}:</span>
                      <strong style={{ color: t.status === "improving" ? "#047857" : t.status === "declining" ? "#b91c1c" : "var(--muted)" }}>
                        {t.status === "improving" ? `Improving (+${t.delta.toFixed(1)})` : t.status === "declining" ? `Declining (${t.delta.toFixed(1)})` : "Stable"}
                      </strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '12px', background: 'var(--surface-muted)', borderRadius: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                Complete at least 3 sessions of the same role to unlock dynamic performance progress trends.
              </div>
            )}

            <button className="primary-action" onClick={onReset}>
              <Play size={18} /> New Session
            </button>
            
            <button className="secondary-action" onClick={onClear} style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
              Clear Local Logs
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sessions.map((session, idx) => (
              <div className="panel" key={session.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--accent-strong)', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>
                    {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </strong>
                  <h3 style={{ margin: '4px 0' }}>{session.profile.role} ({session.profile.difficulty})</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                    {session.records.length} Questions | persona: {session.profile.persona} | Average score: <strong>{session.averageScore.toFixed(1)}/10</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="secondary-action" style={{ padding: '8px 12px', minHeight: 'auto' }} onClick={() => onExport(session)} title="Download Session Markdown Report">
                    <Download size={16} /> Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="feedback-list" style={{ marginTop: '8px' }}>
      <strong style={{ fontSize: '14px', fontWeight: 'bold' }}>{title}</strong>
      <ul style={{ marginTop: '4px', fontSize: '13px' }}>
        {items.map((item, idx) => (
          <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IconButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`icon-button ${active ? "active" : ""}`} aria-label={label} title={label} onClick={onClick}>
      {icon}
    </button>
  );
}
