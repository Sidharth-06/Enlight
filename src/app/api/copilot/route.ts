import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Groq API key is not configured for Copilot." },
      { status: 400 }
    );
  }

  try {
    const { question, code, language, constraints } = await request.json();

    if (!question || !code) {
      return NextResponse.json(
        { error: "Question and code draft are required." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a high-speed, elite Monaco IDE Pair Programming Copilot. Your job is to analyze the user's active code draft and provide a highly targeted, hyper-focused 2-to-3-line code review, hint, or debugging tip. 
Keep your response strictly under 3 sentences. Be extremely direct, clear, and actionable. Do not write full code blocks, just point out syntax errors, logic flaws, or suggest the next algorithmic step.`;

    const userPrompt = `
=== PROBLEM ===
Title: ${question.title || question.topic}
Difficulty: ${question.difficulty}
Scenario: ${question.description || question.prompt}
Task/Prompt: ${question.prompt}
Constraints: ${constraints?.join(", ") || "None"}

=== USER CODE DRAFT (${language}) ===
\`\`\`${language}
${code}
\`\`\`

Analyze the code draft and provide a 2-3 line review/hint.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Groq Copilot API returned HTTP ${response.status}: ${errText}` },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const hintText = payload.choices?.[0]?.message?.content || "Keep coding! Verify your edge cases.";

    return NextResponse.json({ hint: hintText });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Copilot server failure." },
      { status: 500 }
    );
  }
}
