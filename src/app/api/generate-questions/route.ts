import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/anthropic";
import { consumeBudgetOrThrow } from "@/lib/budgetGuard";

/**
 * Dev/single-player endpoint: generates a question bank and returns it
 * directly (including correct answers) for local play/testing.
 * The multiplayer room flow generates + persists questions server-side
 * via lib/anthropic.ts directly and never exposes correct_index here.
 */
export async function POST(req: NextRequest) {
  try {
    const { category, numQuestions } = await req.json();

    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
    const n = Number(numQuestions) || 10;
    if (n < 1 || n > 25) {
      return NextResponse.json({ error: "numQuestions must be 1-25" }, { status: 400 });
    }

    await consumeBudgetOrThrow();
    const questions = await generateQuestions(category, n);
    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate questions";
    const status = message.includes("budget") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
