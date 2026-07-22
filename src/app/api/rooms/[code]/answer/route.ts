import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { authenticatePlayer, getRoomByCode } from "@/lib/roomAuth";
import { calculatePoints } from "@/lib/scoring";
import { broadcastToRoom } from "@/lib/realtime";
import { toPublicPlayer } from "@/types/game";
import { PlayerRow } from "@/lib/supabase/types";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { playerId, token, questionId, choiceIndex } = await req.json();
    if (
      typeof questionId !== "string" ||
      typeof choiceIndex !== "number" ||
      choiceIndex < 0 ||
      choiceIndex > 3
    ) {
      return NextResponse.json({ error: "Invalid answer payload" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    if (room.status !== "active") {
      return NextResponse.json({ error: "Game is not active" }, { status: 409 });
    }

    const player = await authenticatePlayer(supabase, room.id, playerId, token);
    if (!player) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: question } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .eq("room_id", room.id)
      .single();
    if (!question || question.idx !== room.current_question_index) {
      return NextResponse.json({ error: "This question is no longer active" }, { status: 409 });
    }

    const startedAt = room.question_started_at ? new Date(room.question_started_at).getTime() : Date.now();
    const timeMs = Math.max(0, Date.now() - startedAt);
    const isCorrect = choiceIndex === question.correct_index;
    const points = calculatePoints(isCorrect, timeMs, room.seconds_per_question);

    const { error: answerError } = await supabase.from("answers").insert({
      room_id: room.id,
      question_id: question.id,
      player_id: player.id,
      choice_index: choiceIndex,
      is_correct: isCorrect,
      time_ms: timeMs,
      points_awarded: points,
    });
    // Unique constraint (question_id, player_id) blocks double-answers — treat as a no-op, not an error.
    if (answerError && answerError.code !== "23505") throw answerError;

    if (!answerError) {
      const { data: updatedPlayer, error: scoreError } = await supabase
        .from("players")
        .update({ score: player.score + points })
        .eq("id", player.id)
        .select()
        .single();
      if (scoreError) throw scoreError;

      const { data: allPlayers } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id);

      await broadcastToRoom(room.code, {
        type: "scores",
        players: ((allPlayers as PlayerRow[]) ?? []).map(toPublicPlayer),
      });

      return NextResponse.json({ isCorrect, points, score: updatedPlayer.score });
    }

    return NextResponse.json({ isCorrect: null, points: 0, alreadyAnswered: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
