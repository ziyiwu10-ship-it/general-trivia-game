import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoomByCode } from "@/lib/roomAuth";
import { toPublicPlayer } from "@/types/game";
import { PlayerRow } from "@/lib/supabase/types";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const supabase = supabaseServer();
  const room = await getRoomByCode(supabase, params.code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true });

  return NextResponse.json({
    room: {
      code: room.code,
      status: room.status,
      category: room.category,
      numQuestions: room.num_questions,
      secondsPerQuestion: room.seconds_per_question,
      currentQuestionIndex: room.current_question_index,
      questionStartedAt: room.question_started_at,
    },
    players: ((players as PlayerRow[]) ?? []).map(toPublicPlayer),
  });
}
