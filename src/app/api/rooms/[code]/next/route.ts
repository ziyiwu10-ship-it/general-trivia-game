import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { authenticatePlayer, getRoomByCode } from "@/lib/roomAuth";
import { broadcastToRoom } from "@/lib/realtime";
import { toPublicPlayer, toPublicQuestion, toPublicRoom } from "@/types/game";
import { PlayerRow } from "@/lib/supabase/types";

const ADVANCE_GRACE_MS = 500;

/**
 * Advances the room to the next question (or finishes the game). Like
 * /reveal, any authenticated player may call this — server timing is
 * authoritative, and current_question_index is checked before mutating so
 * concurrent calls from multiple clients collapse into a single advance.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { playerId, token, questionIndex } = await req.json();

    const supabase = supabaseServer();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const player = await authenticatePlayer(supabase, room.id, playerId, token);
    if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (room.status !== "active" || room.current_question_index !== questionIndex) {
      return NextResponse.json({ ok: true, alreadyMoved: true });
    }

    const startedAt = room.question_started_at ? new Date(room.question_started_at).getTime() : 0;
    const elapsed = Date.now() - startedAt;
    if (elapsed < room.seconds_per_question * 1000 - ADVANCE_GRACE_MS) {
      return NextResponse.json({ error: "Question still in progress" }, { status: 409 });
    }

    const nextIndex = room.current_question_index + 1;
    const now = new Date().toISOString();

    if (nextIndex >= room.num_questions) {
      const { data: updatedRoom, error } = await supabase
        .from("rooms")
        .update({ status: "finished", updated_at: now })
        .eq("id", room.id)
        .eq("current_question_index", questionIndex)
        .select()
        .single();
      if (error) throw error;
      if (!updatedRoom) return NextResponse.json({ ok: true, alreadyMoved: true });

      const { data: players } = await supabase.from("players").select("*").eq("room_id", room.id);
      await broadcastToRoom(room.code, {
        type: "game_finished",
        players: ((players as PlayerRow[]) ?? []).map(toPublicPlayer),
      });
      return NextResponse.json({ ok: true, finished: true });
    }

    const { data: updatedRoom, error } = await supabase
      .from("rooms")
      .update({ current_question_index: nextIndex, question_started_at: now, updated_at: now })
      .eq("id", room.id)
      .eq("current_question_index", questionIndex)
      .select()
      .single();
    if (error) throw error;
    if (!updatedRoom) return NextResponse.json({ ok: true, alreadyMoved: true });

    const { data: nextQuestion } = await supabase
      .from("questions")
      .select("*")
      .eq("room_id", room.id)
      .eq("idx", nextIndex)
      .single();
    if (!nextQuestion) throw new Error("Next question missing from bank");

    await broadcastToRoom(room.code, {
      type: "question",
      room: toPublicRoom(updatedRoom),
      question: toPublicQuestion(nextQuestion),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to advance question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
