export type InterviewType =
  | "Technical_Coding"
  | "Technical_System_Design"
  | "Behavioral"
  | "Situational"
  | "HR";

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export type Persona = "friendly" | "challenging" | "neutral";

export type SessionStatus = "setup" | "active" | "summary" | "history";

export type Question = {
  id: string;
  type: InterviewType;
  difficulty: DifficultyLevel;
  topic: string;
  prompt: string;
  title?: string;
  description?: string;
  examples?: string;
  hints: string[];
  rubric: string[];
  followUpSeed: string;
  modelAnswer: string;
  constraints?: string[];
  salaryRange?: { Beginner: number; Intermediate: number; Advanced: number };
};

export type Profile = {
  name: string;
  role: string;
  difficulty: DifficultyLevel;
  preferredTypes: InterviewType[];
  persona: Persona;
  timedMode?: boolean;
  selectedConstraints?: string[];
};

export type DimensionScore = {
  label: string;
  score: number;
  impact: number;
  observation: string;
};

export type Feedback = {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  dimensions: DimensionScore[];
  criticalGaps: DimensionScore[];
  minorImprovements: DimensionScore[];
  followUpPolicy: "Offer" | "Auto" | "Optional";
  followUpQuestion: string;
  syntaxError?: string;
  needsElaboration?: boolean;
  missingResult?: boolean;
};

export type AnswerRecord = {
  question: Question;
  answer: string;
  feedback: Feedback;
  hintsUsed: number;
  responseSeconds: number;
  answeredAt: string;
  isAssisted?: boolean;
  followUpsAnswered?: Array<{
    question: string;
    answer: string;
    feedback: Feedback;
    responseSeconds: number;
  }>;
};

