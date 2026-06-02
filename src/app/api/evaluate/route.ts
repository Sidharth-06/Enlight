import { NextResponse } from "next/server";
import { evaluateAnswer } from "@/lib/evaluation";
import { evaluateWithGroq } from "@/lib/groq";
import { Question, Persona, Feedback } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    question?: Question;
    answer?: string;
    hintsUsed?: number;
    persona?: Persona;
    history?: Array<{ question: string; answer: string; feedback: Feedback; responseSeconds?: number }>;
  };

  if (!body.question || typeof body.answer !== "string") {
    return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
  }

  const hintsUsed = Math.max(0, Math.min(Number(body.hintsUsed ?? 0), 3));
  const persona: Persona = body.persona ?? "neutral";
  const history = body.history ?? [];

  try {
    const groqFeedback = await evaluateWithGroq(body.question, body.answer, hintsUsed, persona, history);
    if (groqFeedback) {
      return NextResponse.json({ feedback: groqFeedback, source: "groq" });
    }
  } catch (error) {
    return NextResponse.json({
      feedback: evaluateAnswer(body.question, body.answer, hintsUsed, persona),
      source: "local-fallback",
      warning: error instanceof Error ? error.message : "Groq evaluation unavailable.",
    });
  }

  return NextResponse.json({
    feedback: evaluateAnswer(body.question, body.answer, hintsUsed, persona),
    source: "local-fallback",
  });
}
