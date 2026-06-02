import { DifficultyLevel, Feedback, Question, Persona } from "@/lib/types";

const fillerWords = ["maybe", "probably", "stuff", "things", "whatever", "kinda"];
const negativeSignals = ["hate", "bad boss", "terrible", "toxic", "useless"];

export function evaluateAnswer(
  question: Question,
  answer: string,
  hintsUsed: number,
  persona: Persona = "neutral"
): Feedback {
  const answerLower = answer.toLowerCase();
  const words = answer.trim().split(/\s+/).filter(Boolean);
  
  // 1. Local Delimiter/Bracket Syntax Verification for Code
  let syntaxError: string | undefined;
  if (question.type === "Technical_Coding") {
    const isJavaScript = answer.includes("function") || answer.includes("const ") || answer.includes("let ");
    const isPython = answer.includes("def ") || answer.includes("import ") && !answer.includes(";");
    const lang = isPython ? "python" : isJavaScript ? "javascript" : "java";
    syntaxError = checkCodeSyntax(answer, lang);
  }

  // 2. Behavioral STAR Check & Elaboration Checks
  let needsElaboration = false;
  let missingResult = false;
  
  if (question.type === "Behavioral") {
    // Elaboration checks
    if (words.length <= 100) {
      needsElaboration = true;
    }
    // STAR specific checks
    const hasResult = answerLower.includes("result") || answerLower.includes("impact") || answerLower.includes("outcome") || answerLower.includes("percent") || /\d+%/.test(answerLower);
    if (!hasResult) {
      missingResult = true;
    }
  }

  // 3. HR Salary Verification
  let salaryFeedbackText = "";
  let salaryAdjustment = 0;
  if (question.topic === "Salary Expectations") {
    const res = evaluateSalaryExpectations(answer, question.difficulty);
    salaryFeedbackText = res.text;
    salaryAdjustment = res.scoreAdjustment;
  }

  // Standard rubric scoring
  const rubricHits = question.rubric.map((item) => hasSignal(answerLower, item));
  const lengthScore = Math.min(3, Math.floor(words.length / 35));
  const structureScore = rubricHits.filter(Boolean).length;
  const specificityScore = /\d|because|result|trade[- ]?off|measured|impact|user|customer/.test(answerLower) ? 2 : 0;
  const professionalismPenalty =
    question.type === "HR" && [...fillerWords, ...negativeSignals].some((signal) => answerLower.includes(signal)) ? 1.5 : 0;

  // Base raw score calculation
  let rawScore = Math.max(1, Math.min(10, 2 + lengthScore + structureScore + specificityScore - professionalismPenalty + salaryAdjustment));
  
  // 4. Persona modifiers
  if (persona === "friendly") {
    rawScore = Math.min(10, rawScore + 1.0); // Friendly bonus
  } else if (persona === "challenging") {
    rawScore = Math.max(1, rawScore - 1.5); // Challenging deduction
    
    // Stricter rubric demands for challenging mode
    const allRubricMatched = rubricHits.every(Boolean);
    if (!allRubricMatched && rawScore > 6) {
      rawScore = 6; // Cap score if they didn't touch all rubric dimensions
    }
  }

  // Apply hints penalty: Floor is 1, max ceiling is 10 - hintsUsed
  const score = Math.max(1, Math.min(rawScore, 10 - hintsUsed));

  // Build dimension scorecards
  const dimensions = question.rubric.map((label, index) => {
    const hit = rubricHits[index];
    const impact = hit ? 1 : index === 0 ? 3 : 2;
    return {
      label,
      score: hit ? (persona === "friendly" ? 5 : 4) : (persona === "challenging" ? 1 : 2),
      impact,
      observation: hit
        ? `${label} is addressed successfully with strong contextual signal.`
        : `${label} was omitted or lacks explicit details.`,
    };
  });

  const criticalGaps = dimensions.filter((dimension) => dimension.impact >= 3);
  const minorImprovements = dimensions.filter((dimension) => dimension.impact < 3 && dimension.score < 4);
  const weakest = dimensions.find((dimension) => dimension.score < 4)?.label ?? question.topic;

  // Build dynamic suggestions & improvements
  const strengths = buildStrengths(question, answerLower, dimensions, persona);
  const improvements = buildImprovements(question, answerLower, dimensions, persona);
  if (salaryFeedbackText) {
    improvements.unshift(salaryFeedbackText);
  }

  return {
    score: Math.round(score * 10) / 10,
    strengths,
    improvements,
    suggestions: buildSuggestions(question, weakest),
    dimensions,
    criticalGaps,
    minorImprovements,
    followUpPolicy: score >= 7 ? "Offer" : score < 5 ? "Auto" : "Optional",
    followUpQuestion: `Follow-up on ${weakest}: ${question.followUpSeed}`,
    syntaxError,
    needsElaboration,
    missingResult,
  };
}

export function isSubstantive(answer: string) {
  return answer.trim().split(/\s+/).filter(Boolean).length >= 8;
}

function checkCodeSyntax(code: string, language: string): string | undefined {
  if (!code || code.trim() === "") return undefined;
  
  const stack: string[] = [];
  const matching: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  const lines = code.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (['(', '{', '['].includes(char)) {
        stack.push(char);
      } else if ([')', '}', ']'].includes(char)) {
        const top = stack.pop();
        if (top !== matching[char]) {
          return `SyntaxError: Unbalanced delimiters. Found closed '${char}' at line ${i + 1} with no matching open delimiter.`;
        }
      }
    }
  }
  if (stack.length > 0) {
    return `SyntaxError: Unbalanced delimiters. Found open '${stack.pop()}' without a matching closing delimiter.`;
  }
  
  if (language.toLowerCase() === "python") {
    let lastIndent = 0;
    let expectMoreIndent = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "" || line.trim().startsWith("#")) continue;
      
      const currentIndent = line.search(/\S/);
      if (expectMoreIndent) {
        if (currentIndent <= lastIndent) {
          return `IndentationError: Expected an indented block on line ${i + 1}.`;
        }
        expectMoreIndent = false;
      }
      
      if (line.trim().endsWith(":")) {
        expectMoreIndent = true;
      }
      lastIndent = currentIndent;
    }
  }
  
  return undefined;
}

function evaluateSalaryExpectations(answer: string, difficulty: DifficultyLevel): { text: string; scoreAdjustment: number } {
  const regex = /(?:\$|usd|€|£)?\s*(\d{2,3})(?:,?\d{3})*(?:\s*k)?/gi;
  let match;
  let parsedSalary = 0;
  
  while ((match = regex.exec(answer)) !== null) {
    let val = match[0].toLowerCase();
    let num = parseInt(match[1]);
    if (val.includes("k") || num < 1000) {
      parsedSalary = num * 1000;
    } else {
      parsedSalary = num;
    }
  }
  
  if (parsedSalary === 0) {
    return {
      text: "Guidance: No specific salary figure was declared in the response. This is a very safe strategy to avoid anchoring and maintain maximum negotiation leverage.",
      scoreAdjustment: 0.2
    };
  }
  
  const ranges = {
    Beginner: { min: 60000, max: 90000 },
    Intermediate: { min: 90000, max: 140000 },
    Advanced: { min: 140000, max: 220000 }
  };
  
  const range = ranges[difficulty];
  
  if (parsedSalary < range.min) {
    return {
      text: `Salary Check: Your salary request ($${parsedSalary.toLocaleString()}) is below average market bands ($${range.min.toLocaleString()} - $${range.max.toLocaleString()}) for an ${difficulty} role. Be careful not to undervalue your competence.`,
      scoreAdjustment: -0.3
    };
  } else if (parsedSalary > range.max) {
    return {
      text: `Salary Check: Your salary request ($${parsedSalary.toLocaleString()}) sits slightly above typical market averages ($${range.min.toLocaleString()} - $${range.max.toLocaleString()}) for an ${difficulty} level. Make sure you back this up with strong technical specialization profiles.`,
      scoreAdjustment: -0.2
    };
  } else {
    return {
      text: `Salary Check: Your salary request ($${parsedSalary.toLocaleString()}) fits perfectly inside the market band ($${range.min.toLocaleString()} - $${range.max.toLocaleString()}) for an ${difficulty} tier.`,
      scoreAdjustment: 0.5
    };
  }
}

function hasSignal(answerLower: string, rubricItem: string) {
  const normalized = rubricItem.toLowerCase();
  if (answerLower.includes(normalized)) return true;

  const related: Record<string, string[]> = {
    correctness: ["test", "pass", "valid", "output", "assert", "return"],
    complexity: ["time", "space", "big o", "o(", "complexity", "omega"],
    requirements: ["requirement", "constraint", "clarify", "scoping", "functional"],
    architecture: ["service", "api", "component", "database", "balancer", "microservice"],
    scalability: ["scale", "cache", "load", "latency", "throughput", "sharding"],
    tradeoffs: ["trade", "cost", "risk", "alternative", "downsides"],
    situation: ["situation", "context", "background", "company", "project"],
    task: ["task", "goal", "objective", "assignment"],
    action: ["action", "did", "led", "implemented", "resolved"],
    result: ["result", "impact", "outcome", "percent", "metric", "increased"],
    stakeholders: ["stakeholder", "manager", "team", "customer", "client"],
    practicality: ["step", "plan", "timeline", "pragmatic"],
    professionalism: ["respect", "professional", "positive", "collaborate"],
    clarity: ["clear", "explain", "outline", "structure"],
    rolealignment: ["role", "alignment", "fit", "skills", "experience"]
  };

  return (related[normalized.replace(/[^a-z]/g, "")] ?? []).some((signal) => answerLower.includes(signal));
}

function buildStrengths(question: Question, answerLower: string, dimensions: Feedback["dimensions"], persona: Persona) {
  const hits = dimensions.filter((dimension) => dimension.score >= 4).slice(0, 3);
  const strengths = hits.map((dimension) => `${dimension.label}: Clear and structured signal present.`);

  if (question.type === "Situational" && answerLower.includes("because")) {
    strengths.unshift("Excellent reasoning patterns articulated ahead of recommendations.");
  }
  
  if (persona === "friendly") {
    strengths.unshift("Friendly Interviewer Note: Great tone! Your delivery is engaging and confident.");
  }

  return strengths.length ? strengths : ["You provided a basic conceptual answer. Expand on technical implementation details to strengthen strengths."];
}

function buildImprovements(question: Question, answerLower: string, dimensions: Feedback["dimensions"], persona: Persona) {
  const missing = dimensions.filter((dimension) => dimension.score < 4).map((dimension) => dimension.label);
  const improvements = missing.length ? missing.map((label) => `Explicitly mention details covering: ${label.toLowerCase()}.`) : ["Structure your metric highlights cleaner."];

  if (question.type === "Behavioral" && answerLower.split(/\s+/).length <= 100) {
    improvements.unshift("Behavioral answers should be descriptive and expanded beyond 100 words.");
  }

  if (question.type === "HR" && [...fillerWords, ...negativeSignals].some((signal) => answerLower.includes(signal))) {
    improvements.unshift("Improvement: Try to rephrase vague filler terms or negative expressions into positive, recruiter-friendly scripts.");
  }
  
  if (persona === "challenging") {
    improvements.unshift("Challenging Interviewer Warning: The response lacks critical architectural rigor and concrete validation bounds.");
  }

  return improvements.slice(0, 4);
}

function buildSuggestions(question: Question, weakest: string) {
  if (question.type === "Technical_Coding") {
    return [`Describe your algorithm's high-level strategy first, then address boundary cases and Big O analysis for ${weakest}.`];
  }

  if (question.type === "Behavioral") {
    return [`Draft a precise STAR structured description and quantify outputs related directly to ${weakest}.`];
  }

  return [`Share a real-life instance demonstrating how your ${weakest.toLowerCase()} strategy succeeded in production.`];
}
