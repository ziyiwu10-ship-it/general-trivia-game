import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { authenticatePlayer, getRoomByCode } from "@/lib/roomAuth";
import { generateQuestions } from "@/lib/anthropic";
import { consumeBudgetOrThrow } from "@/lib/budgetGuard";
import { broadcastToRoom } from "@/lib/realtime";
import { toPublicQuestion, toPublicRoom } from "@/types/game";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { playerId, token } = await req.json();
    const supabase = supabaseServer();

    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const player = await authenticatePlayer(supabase, room.id, playerId, token);
    if (!player || !player.is_host) {
      return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
    }
    if (room.status !== "lobby") {
      return NextResponse.json({ error: "Game already started" }, { status: 409 });
    }

    const { count: playerCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id);
    if (!playerCount || playerCount < 1) {
      return NextResponse.json({ error: "Need at least 1 player to start" }, { status: 400 });
    }

    // Avoid repeating questions across back-to-back rooms in the same
    // category (e.g. two Philosophy lobbies in a row) — recent rooms'
    // questions naturally fall out of this pool once they expire and
    // cascade-delete, so it stays bounded without extra cleanup.
    const RECENT_QUESTION_LOOKBACK = 60;
    const { data: recentQuestions } = await supabase
      .from("questions")
      .select("question")
      .eq("category", room.category)
      .order("created_at", { ascending: false })
      .limit(RECENT_QUESTION_LOOKBACK);
    const excludeQuestions = (recentQuestions ?? []).map((q) => q.question as string);

    await consumeBudgetOrThrow();
    const generated = await generateQuestions(room.category, room.num_questions, excludeQuestions);

    const { error: insertError } = await supabase.from("questions").insert(
      generated.map((q, idx) => ({
        room_id: room.id,
        idx,
        question: q.question,
        choices: q.choices,
        correct_index: q.correctIndex,
        category: room.category,
        topic: q.topic,
      }))
    );
    if (insertError) throw insertError;

    const now = new Date().toISOString();
    const { data: updatedRoom, error: updateError } = await supabase
      .from("rooms")
      .update({ status: "active", current_question_index: 0, question_started_at: now, updated_at: now })
      .eq("id", room.id)
      .select()
      .single();
    if (updateError) throw updateError;

    const { data: firstQuestion } = await supabase
      .from("questions")
      .select("*")
      .eq("room_id", room.id)
      .eq("idx", 0)
      .single();

    await broadcastToRoom(room.code, {
      type: "question",
      room: toPublicRoom(updatedRoom),
      question: toPublicQuestion(firstQuestion),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start game";
    const status = message.includes("budget") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
