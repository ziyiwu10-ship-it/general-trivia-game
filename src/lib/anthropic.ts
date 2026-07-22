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
          },
          required: ["question", "choices", "correctIndex"],
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
- Mix of difficulty, skewed toward medium — fun for a knowledgeable friend group, not obscure trivia-champion level.
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

  return input.questions.slice(0, numQuestions).map((q) => ({
    question: q.question,
    choices: q.choices.slice(0, 4) as [string, string, string, string],
    correctIndex: q.correctIndex,
  }));
}
