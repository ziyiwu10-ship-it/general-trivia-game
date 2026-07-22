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
          },
          required: ["question", "choices", "correctIndex", "difficulty"],
        },
      },
    },
    required: ["questions"],
  },
};

export async function generateQuestions(
  category: string,
  numQuestions: number
): Promise<GeneratedQuestion[]> {
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
- Difficulty must ramp up steadily across the set: start with genuinely easy,
  quick-to-answer questions, and progress toward much harder ones by the end.
  Roughly: the first third easy, the middle third medium, and — importantly —
  the final questions should be legitimately hard/expert-level, the kind that
  stump all but the most knowledgeable players. Don't cluster everything in
  the middle; the gap between question 1 and the last question should be
  large and clearly felt.
- Tag each question's difficulty ("easy" | "medium" | "hard" | "expert")
  honestly based on its actual difficulty, and return the questions array
  already ordered from easiest to hardest to match that ramp.
- Each question has exactly 4 answer choices, only one correct.
- Choices should be plausible and similar in length; avoid "all of the above" style choices.
- Keep questions and choices concise (question under 160 chars, choices under 40 chars each).
- No duplicate questions. No preamble, just call the tool.`,
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
    }))
    // Belt-and-suspenders: re-sort by the tagged difficulty in case the
    // model's array order didn't perfectly match its own tags.
    .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
}
