import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface GeneratedQuestion {
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
  /** Short subject for building a "learn more" link, e.g. "Trolley problem". */
  topic: string;
}

const QUESTION_BANK_TOOL = {
  name: "submit_question_bank",
  description: "Submit the generated trivia question bank.",
  input_schema: {
    type: "object" as const,
    properties: {
      questions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            question: { type: "string" as const },
            choices: {
              type: "array" as const,
              items: { type: "string" as const },
              minItems: 4,
              maxItems: 4,
            },
            correctIndex: { type: "integer" as const, minimum: 0, maximum: 3 },
            difficulty: {
              type: "string" as const,
              enum: ["easy", "medium", "hard", "expert"] as const,
            },
            topic: {
              type: "string" as const,
              description: "2-5 word subject to look this question up by, e.g. a Wikipedia article title.",
            },
          },
          required: ["question", "choices", "correctIndex", "difficulty", "topic"],
        },
      },
    },
    required: ["questions"],
  },
};

export async function generateQuestions(
  category: string,
  numQuestions: number,
  excludeQuestions: string[] = []
): Promise<GeneratedQuestion[]> {
  const exclusionBlock =
    excludeQuestions.length > 0
      ? `\n\nDo not reuse any of these questions (already asked recently in this category) — generate genuinely different ones, not just reworded variants:\n${excludeQuestions.map((q) => `- ${q}`).join("\n")}`
      : "";

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [QUESTION_BANK_TOOL],
    tool_choice: { type: "tool", name: "submit_question_bank" },
    messages: [
      {
        role: "user",
        content: `Generate exactly ${numQuestions} trivia questions for a fast-paced party game. Category: "${category}".

Rules:
- Factual accuracy is critical: only use well-established, verifiable facts
  you're highly confident about. Do not invent or guess at dates, numbers, or
  attributions. If a fact is genuinely disputed, ambiguous, or depends on
  changing/recent information, avoid it — use a different, solidly-settled
  question instead. A wrong "correct" answer ruins the game, so when in
  doubt, pick the safer, better-known fact.
- Difficulty must ramp up steadily across the set: start with genuinely easy,
  quick-to-answer questions, and progress toward much harder ones by the end.
  Roughly: the first third easy, the middle third medium, and — importantly —
  the final questions should be legitimately hard/expert-level, the kind that
  stump all but the most knowledgeable players. Don't cluster everything in
  the middle; the gap between question 1 and the last question should be
  large and clearly felt. Do not sacrifice factual accuracy for difficulty —
  a hard question should be hard because it's obscure or requires precise
  knowledge, never because the "correct" answer is actually shaky.
- Tag each question's difficulty ("easy" | "medium" | "hard" | "expert")
  honestly based on its actual difficulty, and return the questions array
  already ordered from easiest to hardest to match that ramp.
- For each question, include a short "topic" — a 2-5 word subject (ideally
  matching a real Wikipedia article title) that a player could look up to
  learn more, e.g. "Trolley problem" or "Congress of Vienna".
- Each question has exactly 4 answer choices, only one correct.
- Choices should be plausible and similar in length; avoid "all of the above" style choices.
- Keep questions and choices concise (question under 160 chars, choices under 40 chars each).
- No duplicate questions within this set.${exclusionBlock}
- No preamble, just call the tool.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("Claude did not return a tool_use block");

  const input = toolUse.input as { questions: GeneratedQuestion[] };
  if (!input.questions || input.questions.length === 0) {
    throw new Error("Claude returned an empty question bank");
  }

  const DIFFICULTY_RANK: Record<GeneratedQuestion["difficulty"], number> = {
    easy: 0,
    medium: 1,
    hard: 2,
    expert: 3,
  };

  return input.questions
    .slice(0, numQuestions)
    .map((q) => ({
      question: q.question,
      choices: q.choices.slice(0, 4) as [string, string, string, string],
      correctIndex: q.correctIndex,
      difficulty: q.difficulty,
      topic: q.topic,
    }))
    // Belt-and-suspenders: re-sort by the tagged difficulty in case the
    // model's array order didn't perfectly match its own tags.
    .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
}
