import { Feedback, Question, Persona } from "@/lib/types";

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function evaluateWithGroq(
  question: Question,
  answer: string,
  hintsUsed: number,
  persona: Persona = "neutral",
  history: Array<{ question: string; answer: string; feedback: Feedback; responseSeconds?: number }> = []
) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return null;
  }

  // Construct structured Persona Guidelines
  let personaGuidelines = "Maintain an objective, professional, and balanced coaching style.";
  if (persona === "friendly") {
    personaGuidelines = "Adopt an extremely encouraging, warm, and supportive persona. Praise strong elements enthusiastically and use gentle, positive vocabulary.";
  } else if (persona === "challenging") {
    personaGuidelines = "Adopt a hyper-critical, rigorous, and demanding interviewer persona. Identify subtle flaws, penalize missing details strictly, and maintain a high standard for a passing score.";
  }

  // Construct Constraints check instructions
  const constraintsCheck = question.constraints && question.constraints.length > 0
    ? `Strictly verify that the user's answer complies with the following system design constraints: ${question.constraints.map(c => `"${c}"`).join(", ")}. Identify any violations in your improvements section.`
    : "No technology constraints are active for this question.";

  const systemPrompt = `You are an expert, elite interview coach. Evaluate the candidate's answer based on the provided question context, difficulty, and rubric.
Guidelines:
- Return ONLY a valid JSON object matching the requested schema. Do not include markdown wraps (like \`\`\`json) or extra text.
- Persona Guidelines: ${personaGuidelines}
- Constraints Checks: ${constraintsCheck}
- Scoring Guidelines: Score the candidate's response strictly on a 1-10 scale. Capping: The score ceiling is ${10 - hintsUsed}. Enforce a minimum score floor of 1. If persona is 'challenging', subtract an additional 1.5 points from your standard rating (with floor of 1) and cap the score at 6/10 if they missed any rubric dimension.`;

  const messages: GroqMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    }
  ];

  // Feed in past conversational QA turns for deep continuity!
  history.forEach((turn) => {
    messages.push({
      role: "user",
      content: `Question: ${turn.question}\n\nMy Answer: ${turn.answer}`,
    });
    messages.push({
      role: "assistant",
      content: JSON.stringify({
        score: turn.feedback.score,
        strengths: turn.feedback.strengths,
        improvements: turn.feedback.improvements,
        suggestions: turn.feedback.suggestions,
        dimensions: turn.feedback.dimensions,
        followUpPolicy: turn.feedback.followUpPolicy,
        followUpQuestion: turn.feedback.followUpQuestion,
      }),
    });
  });

  // Push active current submission
  messages.push({
    role: "user",
    content: JSON.stringify({
      task: "Evaluate this interview answer in context of the conversation.",
      question,
      answer,
      requiredJsonShape: {
        score: "number (scale 1-10, strict penalty applies)",
        strengths: ["string"],
        improvements: ["string"],
        suggestions: ["string"],
        dimensions: [
          {
            label: "string (rubric item name)",
            score: "number from 1 to 5",
            impact: "number from 0 to 5",
            observation: "string",
          },
        ],
        followUpPolicy: "Offer | Auto | Optional",
        followUpQuestion: "string (conversational extension based directly on this answer)",
      },
    }),
  });

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq evaluation failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty evaluation.");
  }

  return normalizeGroqFeedback(JSON.parse(content), question, hintsUsed, persona);
}

function normalizeGroqFeedback(
  raw: Partial<Feedback>,
  question: Question,
  hintsUsed: number,
  persona: Persona
): Feedback {
  let score = Math.max(1, Math.min(Number(raw.score ?? 1), 10 - hintsUsed));
  
  const dimensions = Array.isArray(raw.dimensions)
    ? raw.dimensions.map((dimension) => ({
        label: String(dimension.label ?? "Criterion"),
        score: Math.max(1, Math.min(Number(dimension.score ?? 3), 5)),
        impact: Math.max(0, Math.min(Number(dimension.impact ?? 1), 5)),
        observation: String(dimension.observation ?? "Observation unavailable."),
      }))
    : question.rubric.map((label) => ({
        label,
        score: 3,
        impact: 1,
        observation: `${label} was evaluated by the AI coach.`,
      }));

  // Clean score bounds
  score = Math.round(score * 10) / 10;

  return {
    score,
    strengths: ensureList(raw.strengths, "A clear answer foundation is present."),
    improvements: ensureList(raw.improvements, "Add more specific evidence and trade-offs."),
    suggestions: ensureList(raw.suggestions, "Use a concrete example and quantify impact where possible."),
    dimensions,
    criticalGaps: dimensions.filter((dimension) => dimension.impact >= 3),
    minorImprovements: dimensions.filter((dimension) => dimension.impact < 3 && dimension.score < 4),
    followUpPolicy: raw.followUpPolicy === "Auto" || raw.followUpPolicy === "Optional" ? raw.followUpPolicy : "Offer",
    followUpQuestion:
      typeof raw.followUpQuestion === "string" && raw.followUpQuestion.trim()
        ? raw.followUpQuestion
        : `Follow-up: deepen your answer around ${question.topic}.`,
  };
}

function ensureList(value: unknown, fallback: string) {
  return Array.isArray(value) && value.length ? value.map(String).filter(Boolean) : [fallback];
}
