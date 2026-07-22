import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoomByCode } from "@/lib/roomAuth";

function wikipediaSearchUrl(topic: string): string {
  const q = new URLSearchParams({ search: topic, title: "Special:Search", fulltext: "1", ns0: "1" });
  return `https://en.wikipedia.org/w/index.php?${q.toString()}`;
}

/**
 * Full question recap with correct answers + reference links — only
 * available once the room has actually finished, so it can never be used
 * to peek at answers mid-game.
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const supabase = supabaseServer();
  const room = await getRoomByCode(supabase, params.code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "finished") {
    return NextResponse.json({ error: "Recap is only available after the game ends" }, { status: 409 });
  }

  const { data: questions, error } = await supabase
    .from("questions")
    .select("*")
    .eq("room_id", room.id)
    .order("idx", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const recap = (questions ?? []).map((q) => ({
    idx: q.idx,
    question: q.question,
    choices: q.choices,
    correctIndex: q.correct_index,
    correctAnswer: q.choices[q.correct_index],
    topic: q.topic,
    learnMoreUrl: wikipediaSearchUrl(q.topic || q.question),
  }));

  return NextResponse.json({ recap });
}
