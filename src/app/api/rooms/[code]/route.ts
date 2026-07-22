import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoomByCode } from "@/lib/roomAuth";
import { toPublicPlayer, toPublicQuestion, toPublicRoom } from "@/types/game";
import { PlayerRow } from "@/lib/supabase/types";

// This is the core room/live-state fetch (initial load, every resync) —
// Next.js caches GET route handlers by default unless told otherwise,
// which would silently serve stale room/question/player state.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const supabase = supabaseServer();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const { data: players } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });

    let question = null;
    let hasAnswered = false;
    if (room.status === "active" && room.current_question_index >= 0) {
      const { data: q } = await supabase
        .from("questions")
        .select("*")
        .eq("room_id", room.id)
        .eq("idx", room.current_question_index)
        .maybeSingle();
      if (q) question = toPublicQuestion(q);

      const playerId = req.nextUrl.searchParams.get("playerId");
      if (playerId && q) {
        const { data: existingAnswer } = await supabase
          .from("answers")
          .select("id")
          .eq("question_id", q.id)
          .eq("player_id", playerId)
          .maybeSingle();
        hasAnswered = !!existingAnswer;
      }
    }

    return NextResponse.json({
      room: toPublicRoom(room),
      players: ((players as PlayerRow[]) ?? []).map(toPublicPlayer),
      question,
      hasAnswered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
