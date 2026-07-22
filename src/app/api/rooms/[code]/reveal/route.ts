import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { authenticatePlayer, getRoomByCode } from "@/lib/roomAuth";
import { broadcastToRoom } from "@/lib/realtime";
import { toPublicPlayer } from "@/types/game";
import { PlayerRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const REVEAL_GRACE_MS = 1000;

/**
 * Reveals the current question's correct answer to the room. Any authenticated
 * player may trigger this (not just the host) once the question's time window
 * has elapsed — server time is authoritative, so an early client call is
 * simply rejected rather than trusted. This keeps the game moving even if the
 * host's tab is backgrounded, since every client independently races to call
 * it when its local countdown reaches zero; whichever call lands first wins
 * and the rest are harmless no-ops.
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
    if (elapsed < room.seconds_per_question * 1000 - REVEAL_GRACE_MS) {
      return NextResponse.json({ error: "Question still in progress" }, { status: 409 });
    }

    const { data: question } = await supabase
      .from("questions")
      .select("*")
      .eq("room_id", room.id)
      .eq("idx", questionIndex)
      .single();
    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const { data: players } = await supabase.from("players").select("*").eq("room_id", room.id);

    await broadcastToRoom(room.code, {
      type: "question_ended",
      questionIndex,
      correctIndex: question.correct_index,
      players: ((players as PlayerRow[]) ?? []).map(toPublicPlayer),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reveal answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
