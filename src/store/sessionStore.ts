import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AnswerRecord, DifficultyLevel, InterviewType, Persona, Profile, Question } from "@/lib/types";

export type SessionStatus = "idle" | "setup" | "active" | "summary";

type SessionState = {
  profile: Profile;
  plan: Question[];
  index: number;
  records: AnswerRecord[];
  status: SessionStatus;
  starredQuestions: string[];
  flaggedQuestions: string[];
  interviewerMood: "Professional" | "Impressed" | "Skeptical" | "Supportive";
  drafts: Record<string, string>;

  // Actions
  setProfile: (p: Profile) => void;
  startSession: (plan: Question[], profile: Profile) => void;
  addRecord: (r: AnswerRecord) => void;
  nextQuestion: () => void;
  resetSession: () => void;
  toggleStar: (id: string) => void;
  flagQuestion: (id: string) => void;
  setStatus: (s: SessionStatus) => void;
  loadPausedSession: (state: Partial<SessionState>) => void;
  setDraft: (questionId: string, draft: string) => void;
};

const defaultProfile: Profile = {
  name: "",
  role: "Software Engineer",
  difficulty: "Intermediate",
  preferredTypes: ["Technical_Coding", "Behavioral"],
  persona: "friendly",
  timedMode: false,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      plan: [],
      index: 0,
      records: [],
      status: "setup",
      starredQuestions: [],
      flaggedQuestions: [],
      interviewerMood: "Professional",
      drafts: {},

      setProfile: (p) => set({ profile: p }),

      startSession: (plan, profile) =>
        set({ plan, profile, index: 0, records: [], status: "active", interviewerMood: "Professional", drafts: {} }),

      addRecord: (r) =>
        set((s) => {
          // Overwrite existing record if resubmitting the same question ID, otherwise append
          const exists = s.records.some((rec) => rec.question.id === r.question.id);
          const newRecords = exists
            ? s.records.map((rec) => (rec.question.id === r.question.id ? r : rec))
            : [...s.records, r];
          
          // Determine the interviewer mood dynamically based on average scores and hints
          let newMood: "Professional" | "Impressed" | "Skeptical" | "Supportive" = "Professional";
          
          if (newRecords.length > 0) {
            const avgScore = newRecords.reduce((acc, rec) => acc + (rec.feedback?.score || 0), 0) / newRecords.length;
            const totalHints = newRecords.reduce((acc, rec) => acc + (rec.hintsUsed || 0), 0);
            
            if (r.hintsUsed >= 2 || totalHints / newRecords.length >= 1.5) {
              newMood = "Supportive";
            } else if (avgScore >= 8.5) {
              newMood = "Impressed";
            } else if (avgScore < 6.0) {
              newMood = "Skeptical";
            }
          }
          
          return { records: newRecords, interviewerMood: newMood };
        }),

      nextQuestion: () =>
        set((s) => {
          const next = s.index + 1;
          if (next >= s.plan.length) return { status: "summary" };
          return { index: next };
        }),

      resetSession: () =>
        set({ plan: [], index: 0, records: [], status: "setup", interviewerMood: "Professional", drafts: {} }),

      toggleStar: (id) =>
        set((s) => ({
          starredQuestions: s.starredQuestions.includes(id)
            ? s.starredQuestions.filter((x) => x !== id)
            : [...s.starredQuestions, id],
        })),

      flagQuestion: (id) =>
        set((s) => ({ flaggedQuestions: [...new Set([...s.flaggedQuestions, id])] })),

      setStatus: (status) => set({ status }),

      loadPausedSession: (state) => set(state as SessionState),

      setDraft: (questionId, draft) =>
        set((s) => ({
          drafts: {
            ...s.drafts,
            [questionId]: draft,
          },
        })),
    }),
    {
      name: "interview-session-store",
      partialize: (s) => ({
        profile: s.profile,
        plan: s.plan,
        index: s.index,
        records: s.records,
        status: s.status,
        interviewerMood: s.interviewerMood,
        starredQuestions: s.starredQuestions,
        flaggedQuestions: s.flaggedQuestions,
        drafts: s.drafts,
      }),
    }
  )
);
