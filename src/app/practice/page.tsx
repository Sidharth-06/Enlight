"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { useSessionStore } from "@/store/sessionStore";
import { useAuth } from "@/context/AuthContext";
import { evaluateAnswer, isSubstantive } from "@/lib/evaluation";
import AppLayout from "@/components/shared/AppLayout";
import toast from "react-hot-toast";
import {
  Clock, Lightbulb, Star, Flag,
  RotateCcw, Send, Mic, MicOff, Code2, BookOpen,
  CheckCircle2, AlertTriangle, ArrowRight, X, Sparkles
} from "lucide-react";
import type { AnswerRecord, Feedback, InterviewType } from "@/lib/types";

const CODING_LANGS = [
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "Go", value: "go" },
  { label: "TypeScript", value: "typescript" },
];

const TYPE_COLORS: Record<InterviewType, string> = {
  Technical_Coding: "#10b981",
  Technical_System_Design: "#6366f1",
  Behavioral: "#f59e0b",
  Situational: "#ef4444",
  HR: "#8b5cf6",
};

export default function PracticePage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    plan, index, records, profile, status,
    addRecord, nextQuestion, resetSession,
    toggleStar, flagQuestion, starredQuestions,
    interviewerMood,
  } = useSessionStore();

  // ── State ─────────────────────────────────────────────────
  const [answer, setAnswer] = useState("");
  const [editorLang, setEditorLang] = useState("javascript");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">("light");
  const [isListening, setIsListening] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotHint, setCopilotHint] = useState<string | null>(null);

  async function triggerCopilot() {
    if (!answer.trim()) {
      toast.error("Type some code first so Copilot can analyze your draft!");
      return;
    }
    setIsCopilotLoading(true);
    const loadingToast = toast.loading("Analyzing your active draft...");
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          code: answer,
          language: isCoding ? editorLang : "text",
          constraints: currentQuestion.constraints || [],
        }),
      });
      toast.dismiss(loadingToast);
      if (!res.ok) throw new Error("Copilot service unavailable.");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCopilotHint(data.hint);
      toast.success("AI Review generated!");
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to call Copilot");
    } finally {
      setIsCopilotLoading(false);
    }
  }
  const [intervention, setIntervention] = useState<"elaboration" | "missing_result" | null>(null);
  const [isModelRevealed, setIsModelRevealed] = useState(false);
  const [followUpActive, setFollowUpActive] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [startedAt] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  // ── Split panel state ─────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(40);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Refs ──────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // ── Derived ───────────────────────────────────────────────
  const currentQuestion = plan[index];
  const isCoding = currentQuestion?.type === "Technical_Coding";
  const isTextual = ["Behavioral", "Situational", "HR"].includes(currentQuestion?.type || "");
  const isStarred = starredQuestions.includes(currentQuestion?.id || "");
  const typeColor = TYPE_COLORS[currentQuestion?.type as InterviewType] || "#10b981";
  const progress = ((index + (feedback ? 1 : 0)) / (plan.length || 1)) * 100;

  // ── Mount guard ───────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("interview-prep-theme") as "light" | "dark" | null;
    setEditorTheme(saved ?? "light");
  }, []);

  // Redirect only after mount to avoid SSR flash
  useEffect(() => {
    if (!mounted) return;
    if (status !== "active" || plan.length === 0) {
      router.push("/dashboard");
    }
  }, [mounted, status, plan.length]);

  // Reset state on question change
  useEffect(() => {
    setAnswer("");
    setFeedback(null);
    setDrawerOpen(false);
    setHintsUsed(0);
    setHintsVisible(false);
    setIntervention(null);
    setIsModelRevealed(false);
    setFollowUpActive(false);
    setFollowUpAnswer("");
  }, [index]);

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (!currentQuestion || isEvaluating) return;
    if (!auto && !isSubstantive(answer)) {
      toast.error("Add more detail before submitting");
      return;
    }

    const localResult = evaluateAnswer(currentQuestion, answer, hintsUsed, profile.persona);

    if (!auto && currentQuestion.type === "Behavioral" && (localResult.needsElaboration || localResult.missingResult)) {
      setIntervention(localResult.needsElaboration ? "elaboration" : "missing_result");
      return;
    }

    setIsEvaluating(true);
    setIntervention(null);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion, answer, hintsUsed, persona: profile.persona }),
      });
      const data = await res.json();
      const fb: Feedback = data.feedback || localResult;
      if (isModelRevealed) fb.score = Math.min(5, fb.score);

      setFeedback(fb);
      setDrawerOpen(true);

      const record: AnswerRecord = {
        question: currentQuestion,
        answer,
        feedback: fb,
        hintsUsed,
        responseSeconds: Math.round((Date.now() - startedAt) / 1000),
        answeredAt: new Date().toISOString(),
        isAssisted: isModelRevealed,
        followUpsAnswered: [],
      };
      addRecord(record);
    } catch {
      const fb = localResult;
      setFeedback(fb);
      setDrawerOpen(true);
      addRecord({
        question: currentQuestion,
        answer,
        feedback: fb,
        hintsUsed,
        responseSeconds: 0,
        answeredAt: new Date().toISOString(),
      });
    } finally {
      setIsEvaluating(false);
    }
  }, [currentQuestion, isEvaluating, answer, hintsUsed, profile.persona, isModelRevealed, startedAt, addRecord]);

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!profile.timedMode) return;
    setTimeRemaining(180);
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, profile.timedMode, handleSubmit]);

  // ── Next question ─────────────────────────────────────────
  function handleNext() {
    setDrawerOpen(false);
    setTimeout(async () => {
      // Clear workspace inputs for standard questions
      setAnswer("");
      setFeedback(null);
      setHintsUsed(0);
      setHintsVisible(false);
      setIsModelRevealed(false);
      setFollowUpActive(false);
      setFollowUpAnswer("");
      setCopilotHint(null);

      nextQuestion();
      const state = useSessionStore.getState();
      if (state.status === "summary") {
        await saveAndNavigate(state);
      }
    }, 300);
  }

  async function saveAndNavigate(state: ReturnType<typeof useSessionStore.getState>) {
    const avgScore = state.records.reduce((s, r) => s + r.feedback.score, 0) / (state.records.length || 1);
    const sessionData = {
      profile: state.profile,
      records: state.records,
      plan: state.plan,
      averageScore: Math.round(avgScore * 10) / 10,
      totalHints: state.records.reduce((s, r) => s + r.hintsUsed, 0),
      createdAt: new Date().toISOString(),
      userId: user?.id,
    };

    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionData),
      });
      const prev = JSON.parse(localStorage.getItem("interview-prep-history") || "[]");
      localStorage.setItem("interview-prep-history", JSON.stringify([sessionData, ...prev].slice(0, 20)));
      toast.success("Session saved!");
    } catch {
      toast.error("Could not save session to cloud, but it's saved locally.");
    }
    router.push("/history");
  }

  // ── Mic dictation ─────────────────────────────────────────
  async function toggleListening() {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsListening(false);

        console.log(`[Practice Client] Audio recording stopped. MimeType: ${mimeType}, Size: ${blob.size} bytes`);

        if (blob.size === 0) {
          console.warn("[Practice Client] Audio recording is empty (0 bytes). Skipping cloud transcription.");
          toast.error("No audio was recorded. Please check your mic and try speaking again.");
          return;
        }

        // Extract a clean file extension from the mime type (e.g. "audio/webm;codecs=opus" -> "webm")
        const cleanExtension = (mimeType.split(";")[0] || "audio/webm").split("/")[1] || "webm";
        const form = new FormData();
        form.append("audio", blob, `audio.${cleanExtension}`);

        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: form });

          let data: { text?: string; error?: string } = {};
          try {
            data = await res.json();
          } catch (jsonErr) {
            console.error("Failed to parse transcription API JSON", jsonErr);
          }

          if (!res.ok) {
            throw new Error(data.error || `Transcription API returned status ${res.status}`);
          }

          if (data.error) {
            throw new Error(data.error);
          }

          const transText = data.text;
          if (transText && transText.trim()) {
            setAnswer((prev) => prev + (prev ? " " : "") + transText.trim());
          }
        } catch (err: any) {
          console.warn("Cloud transcription failed in practice workspace:", err.message || err);
          toast.error(err.message || "Cloud transcription failed.");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsListening(true);
    } catch {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (e: any) => {
          const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
          setAnswer((prev) => prev + " " + text);
        };
        rec.onend = () => setIsListening(false);
        recognitionRef.current = rec;
        rec.start();
        setIsListening(true);
      } else {
        toast.error("Microphone not supported in this browser");
      }
    }
  }

  // ── Split panel drag ──────────────────────────────────────
  function onPanelMouseDown() {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }
  function onPanelMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftWidth(Math.min(65, Math.max(25, pct)));
  }
  function onPanelMouseUp() {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  if (!mounted || !currentQuestion) return null;

  return (
    <AppLayout>
      <div className="practice-shell">
        {/* ── TOP BAR ──────────────────────────────────────── */}
        <div className="practice-topbar">
          <div className="practice-topbar-left">
            <div className="practice-nav-info">
              <span className="practice-qnum">Q{index + 1}</span>
              <span className="practice-qtotal">/ {plan.length}</span>
            </div>
            <div className="practice-progress-track">
              <motion.div
                className="practice-progress-fill"
                style={{ background: typeColor }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div
              className="practice-type-pill"
              style={{ color: typeColor, borderColor: `${typeColor}40`, background: `${typeColor}12` }}
            >
              {currentQuestion.type.replace(/_/g, " ")}
            </div>
          </div>

          <div className="practice-topbar-right">
            {/* Interviewer Mood Widget */}
            {mounted && interviewerMood && (
              <div className={`mood-badge ${interviewerMood.toLowerCase()}`} title={`Interviewer Mood: ${interviewerMood}`}>
                <span className="mood-badge-dot" />
                <span className="mood-badge-icon">
                  {interviewerMood === "Impressed" ? "🏆" : interviewerMood === "Skeptical" ? "🧐" : interviewerMood === "Supportive" ? "🤝" : "⚖️"}
                </span>
                <span className="mood-badge-label">{interviewerMood}</span>
              </div>
            )}

            {profile.timedMode && timeRemaining !== null && (
              <div className={`practice-timer ${timeRemaining < 30 ? "danger" : ""}`}>
                <Clock size={14} />
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}
              </div>
            )}

            <button
              className="practice-action-btn"
              onClick={() => toggleStar(currentQuestion.id)}
              title={isStarred ? "Unstar" : "Star question"}
            >
              <Star
                size={16}
                fill={isStarred ? "#f59e0b" : "none"}
                style={{ color: isStarred ? "#f59e0b" : "var(--muted)" }}
              />
            </button>

            <button
              className="practice-action-btn danger"
              onClick={() => { flagQuestion(currentQuestion.id); handleNext(); }}
              title="Flag & skip"
              disabled={!!feedback}
            >
              <Flag size={16} />
            </button>

            <button
              className="practice-action-btn"
              onClick={() => { resetSession(); router.push("/dashboard"); }}
              title="Exit session"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── SPLIT PANELS ─────────────────────────────────── */}
        <div
          ref={containerRef}
          className="practice-panels"
          onMouseMove={onPanelMouseMove}
          onMouseUp={onPanelMouseUp}
          onMouseLeave={onPanelMouseUp}
        >
          {/* LEFT: Question panel */}
          <div className="question-panel-wrap" style={{ width: `${leftWidth}%` }}>
            <div className="question-panel">
              {/* Badges */}
              <div className="question-meta-bar">
                <span
                  className="q-badge"
                  style={{ color: typeColor, background: `${typeColor}12`, borderColor: `${typeColor}30` }}
                >
                  {currentQuestion.difficulty}
                </span>
                <span className="q-badge" style={{ color: "var(--muted)", background: "var(--surface-muted)", borderColor: "var(--line)" }}>
                  {currentQuestion.topic}
                </span>
              </div>

              {/* Question Title */}
              <h2 className="question-title">{currentQuestion.title || currentQuestion.topic}</h2>

              {/* Scenario Context */}
              <div className="question-description">
                <p>{currentQuestion.description || currentQuestion.prompt}</p>
              </div>

              {/* Specific Task Prompt Callout Box */}
              {currentQuestion.description && (
                <div
                  className="question-task-box"
                  style={{
                    borderLeft: `4px solid ${typeColor}`,
                    background: `${typeColor}08`
                  }}
                >
                  <div className="task-box-label" style={{ color: typeColor }}>Your Task</div>
                  <p className="task-box-prompt">{currentQuestion.prompt}</p>
                </div>
              )}

              {currentQuestion.examples && (
                <div className="question-example">
                  <div className="question-example-label">Example</div>
                  <pre className="question-example-text">{currentQuestion.examples}</pre>
                </div>
              )}

              {/* Rubric */}
              <div className="question-rubric">
                <div className="rubric-title">Evaluation Criteria</div>
                <div className="rubric-list">
                  {currentQuestion.rubric.map((r) => (
                    <div key={r} className="rubric-item">
                      <div className="rubric-dot" style={{ background: typeColor }} />
                      {r}
                    </div>
                  ))}
                </div>
              </div>

              {/* STAR reminder for behavioral */}
              {isTextual && currentQuestion.type === "Behavioral" && (
                <div className="star-reminder">
                  <div className="star-reminder-title">STAR Framework</div>
                  <div className="star-steps">
                    {["Situation", "Task", "Action", "Result"].map((s, i) => (
                      <div key={s} className="star-step">
                        <span className="star-step-num">{i + 1}</span>
                        <span className="star-step-label">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hints */}
              {currentQuestion.hints.length > 0 && !feedback && (
                <div className="hints-section">
                  <button
                    className="hints-toggle"
                    onClick={() => {
                      setHintsVisible(!hintsVisible);
                      if (!hintsVisible && hintsUsed < 3) setHintsUsed((h) => h + 1);
                    }}
                  >
                    <Lightbulb size={14} />
                    {hintsVisible ? "Hide Hint" : `Reveal Hint (−1 pt each, ${3 - hintsUsed} left)`}
                  </button>
                  <AnimatePresence>
                    {hintsVisible && (
                      <motion.div
                        className="hints-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {currentQuestion.hints.slice(0, Math.max(hintsUsed, 1)).map((h, i) => (
                          <div key={i} className="hint-item">
                            <span className="hint-num">{i + 1}</span>
                            {h}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Reveal model answer */}
              {!feedback && !isModelRevealed && (
                <button className="reveal-btn" onClick={() => setIsModelRevealed(true)}>
                  <BookOpen size={14} />
                  Reveal Model Answer
                  <span className="reveal-warn">−5 pts cap</span>
                </button>
              )}

              {isModelRevealed && (
                <div className="model-answer-box">
                  <div className="model-answer-label">📖 Model Answer</div>
                  <div className="model-answer-text">{currentQuestion.modelAnswer}</div>
                </div>
              )}
            </div>
          </div>

          {/* Drag handle */}
          <div className="panel-resize-handle" onMouseDown={onPanelMouseDown}>
            <div className="resize-dots">
              <div className="resize-dot" /><div className="resize-dot" /><div className="resize-dot" />
            </div>
          </div>

          {/* RIGHT: Editor panel */}
          <div className="editor-panel-wrap" style={{ flex: 1, minWidth: 0 }}>
            <div className="editor-panel">
              {/* Toolbar */}
              <div className="editor-toolbar">
                <div className="editor-toolbar-left">
                  {isCoding ? (
                    <div className="lang-selector-wrap">
                      <Code2 size={14} />
                      <select
                        value={editorLang}
                        onChange={(e) => setEditorLang(e.target.value)}
                        className="lang-selector"
                        disabled={!!feedback}
                      >
                        {CODING_LANGS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="editor-toolbar-label">
                      {currentQuestion.type === "Behavioral" ? "📝 STAR Method Answer" : "Your Answer"}
                    </span>
                  )}
                </div>

                <div className="editor-toolbar-right">
                  {isTextual && (
                    <button
                      className={`mic-btn ${isListening ? "listening" : ""}`}
                      onClick={toggleListening}
                      disabled={!!feedback}
                      title={isListening ? "Stop recording" : "Dictate answer"}
                    >
                      {isListening ? (
                        <><MicOff size={14} /><span>Stop</span><div className="mic-wave" /></>
                      ) : (
                        <><Mic size={14} /><span>Dictate</span></>
                      )}
                    </button>
                  )}
                  {!feedback && (
                    <>
                      {/* AI Copilot Button */}
                      <button
                        className={`copilot-btn ${isCopilotLoading ? "loading" : ""}`}
                        onClick={triggerCopilot}
                        title="Get targeted AI code suggestion"
                        disabled={isCopilotLoading}
                      >
                        {isCopilotLoading ? (
                          <div className="btn-spinner" />
                        ) : (
                          <>
                            <Sparkles size={13} />
                            <span>Copilot</span>
                          </>
                        )}
                      </button>

                      <button className="reset-btn" onClick={() => setAnswer("")} title="Clear editor">
                        <RotateCcw size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor body */}
              <div className="editor-body">
                {isCoding ? (
                  <Editor
                    height="100%"
                    language={editorLang}
                    value={answer}
                    theme={editorTheme === "dark" ? "vs-dark" : "vs-light"}
                    onChange={(v) => !feedback && setAnswer(v ?? "")}
                    options={{
                      readOnly: !!feedback,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineHeight: 22,
                      padding: { top: 16, bottom: 16 },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      fontLigatures: true,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                      suggest: { showWords: false },
                    }}
                    loading={<div className="editor-loading"><div className="btn-spinner" style={{ borderColor: "var(--line)", borderTopColor: "var(--accent)" }} /></div>}
                  />
                ) : (
                  <textarea
                    className="answer-textarea"
                    value={answer}
                    onChange={(e) => !feedback && setAnswer(e.target.value)}
                    disabled={!!feedback}
                    placeholder={
                      currentQuestion.type === "Behavioral"
                        ? "Situation: ...\n\nTask: ...\n\nAction: ...\n\nResult: ..."
                        : currentQuestion.type === "HR"
                          ? "Be authentic and specific. Discuss your motivations, expectations, and goals..."
                          : "Describe your approach clearly, covering key considerations and trade-offs..."
                    }
                  />
                )}

                {/* Monaco Copilot Sliding Hint Panel */}
                <AnimatePresence>
                  {copilotHint && (
                    <motion.div
                      className="copilot-drawer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="copilot-drawer-header">
                        <div className="copilot-drawer-title">
                          <Sparkles size={14} style={{ color: "#10b981" }} />
                          <span>AI Copilot Review</span>
                        </div>
                        <button className="copilot-drawer-close" onClick={() => setCopilotHint(null)}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="copilot-drawer-body">
                        <p>{copilotHint}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit bar */}
              {!feedback && (
                <div className="submit-bar">
                  <AnimatePresence>
                    {intervention && (
                      <motion.div
                        className="intervention-alert"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                      >
                        <AlertTriangle size={15} />
                        <span>
                          {intervention === "elaboration"
                            ? "Add more detail — behavioral answers need depth"
                            : "Your answer is missing a clear Result"}
                        </span>
                        <button className="intervention-force" onClick={() => handleSubmit()}>
                          Submit anyway
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isCoding && (
                    <div className="char-count">
                      {answer.trim().split("\n").length} lines · {answer.trim().length} chars
                    </div>
                  )}

                  <motion.button
                    className="submit-btn"
                    style={{ background: typeColor }}
                    onClick={() => handleSubmit()}
                    disabled={isEvaluating || !answer.trim()}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ filter: "brightness(1.08)" }}
                  >
                    {isEvaluating ? (
                      <><div className="btn-spinner white" />Evaluating...</>
                    ) : (
                      <><Send size={16} />Submit Answer</>
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FEEDBACK DRAWER ───────────────────────────────── */}
        <AnimatePresence>
          {drawerOpen && feedback && (
            <motion.div
              className="feedback-drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              <div className="feedback-drawer-inner">
                {/* Header row: score + summary */}
                <div className="feedback-score-section">
                  <div className="score-ring">
                    <svg width="88" height="88" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r="36" fill="none" stroke="var(--line)" strokeWidth="7" />
                      <motion.circle
                        cx="44" cy="44" r="36" fill="none"
                        stroke={typeColor} strokeWidth="7" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - feedback.score / 10) }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        transform="rotate(-90 44 44)"
                      />
                    </svg>
                    <div className="score-ring-text">
                      <span className="score-value">{feedback.score}</span>
                      <span className="score-denom">/10</span>
                    </div>
                  </div>

                  <div className="feedback-meta">
                    <h3 className="feedback-title">
                      {feedback.score >= 8 ? "🎉 Excellent!" :
                        feedback.score >= 6 ? "👍 Good answer" :
                          feedback.score >= 4 ? "🔨 Needs work" :
                            "📚 Keep practicing"}
                    </h3>
                    <p className="feedback-source">
                      AI Coach · <span style={{ textTransform: "capitalize" }}>{profile.persona}</span> mode ·{" "}
                      {currentQuestion.type.replace(/_/g, " ")}
                    </p>
                    <div className="feedback-pills">
                      {feedback.strengths.slice(0, 2).map((s, i) => (
                        <span key={i} className="feedback-pill strength">✓ {s}</span>
                      ))}
                    </div>
                  </div>

                  <button
                    className="drawer-close-btn"
                    onClick={() => setDrawerOpen(false)}
                    title="Minimise feedback"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Details grid */}
                <div className="feedback-details">
                  <FeedbackSection title="Strengths" items={feedback.strengths} color="#10b981" icon="✓" />
                  <FeedbackSection title="To Improve" items={feedback.improvements} color="#f59e0b" icon="→" />
                  <FeedbackSection title="Suggestions" items={feedback.suggestions} color="#6366f1" icon="💡" />
                  {feedback.criticalGaps.length > 0 && (
                    <FeedbackSection
                      title="Critical Gaps"
                      items={feedback.criticalGaps.map((g) => g.observation)}
                      color="#ef4444"
                      icon="⚠"
                    />
                  )}
                </div>

                {/* Dimension scores */}
                {feedback.dimensions.length > 0 && (
                  <div className="dimension-scores">
                    {feedback.dimensions.slice(0, 4).map((d) => (
                      <div key={d.label} className="dimension-item">
                        <div className="dimension-header">
                          <span className="dimension-label">{d.label}</span>
                          <span className="dimension-score" style={{ color: d.score >= 4 ? "#10b981" : d.score >= 3 ? "#f59e0b" : "#ef4444" }}>
                            {d.score}/5
                          </span>
                        </div>
                        <div className="dimension-bar-bg">
                          <motion.div
                            className="dimension-bar-fill"
                            style={{ background: d.score >= 4 ? "#10b981" : d.score >= 3 ? "#f59e0b" : "#ef4444" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(d.score / 5) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Follow-up */}
                {feedback.followUpPolicy !== "Optional" && feedback.followUpQuestion && (
                  <div className="followup-section">
                    <div className="followup-label">💬 Follow-up Question</div>
                    <div className="followup-question">{feedback.followUpQuestion}</div>
                    {!followUpActive ? (
                      <button className="followup-btn" onClick={() => setFollowUpActive(true)}>
                        Answer follow-up
                      </button>
                    ) : (
                      <div className="followup-input-wrap">
                        <textarea
                          className="followup-textarea"
                          value={followUpAnswer}
                          onChange={(e) => setFollowUpAnswer(e.target.value)}
                          placeholder="Your follow-up answer..."
                        />
                        <button className="followup-submit" onClick={() => setFollowUpActive(false)}>
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="drawer-cta">
                  <motion.button
                    className="next-btn"
                    onClick={handleNext}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {index + 1 >= plan.length ? (
                      <><CheckCircle2 size={18} />Complete Session</>
                    ) : (
                      <>Next Question <ArrowRight size={18} /></>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating "View Feedback" chip when drawer is closed after submit */}
        {feedback && !drawerOpen && (
          <motion.button
            className="feedback-reopen-btn"
            style={{ background: typeColor }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setDrawerOpen(true)}
          >
            View Feedback · {feedback.score}/10
          </motion.button>
        )}
      </div>
    </AppLayout>
  );
}

function FeedbackSection({ title, items, color, icon }: {
  title: string; items: string[]; color: string; icon: string;
}) {
  if (!items.length) return null;
  return (
    <div className="feedback-section">
      <div className="feedback-section-title" style={{ color }}>{icon} {title}</div>
      <ul className="feedback-list">
        {items.map((item, i) => (
          <li key={i} className="feedback-list-item">{item}</li>
        ))}
      </ul>
    </div>
  );
}
