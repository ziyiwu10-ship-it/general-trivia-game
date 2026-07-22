import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/roomCode";
import { AVATARS, DEFAULT_AVATAR } from "@/lib/avatars";

const SECONDS_PER_QUESTION = 20;

export async function POST(req: NextRequest) {
  try {
    const { hostName, category, numQuestions, avatar } = await req.json();

    if (!hostName || typeof hostName !== "string" || hostName.trim().length === 0) {
      return NextResponse.json({ error: "hostName is required" }, { status: 400 });
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
    const n = Number(numQuestions) || 10;
    if (n < 1 || n > 25) {
      return NextResponse.json({ error: "numQuestions must be 1-25" }, { status: 400 });
    }
    const chosenAvatar = AVATARS.includes(avatar) ? avatar : DEFAULT_AVATAR;

    const supabase = supabaseServer();

    let room = null;
    for (let attempt = 0; attempt < 5 && !room; attempt++) {
      const code = generateRoomCode();
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          code,
          category,
          num_questions: n,
          seconds_per_question: SECONDS_PER_QUESTION,
        })
        .select()
        .single();
      if (!error) room = data;
      else if (error.code !== "23505") throw error; // ignore unique-violation retries
    }
    if (!room) throw new Error("Could not allocate a unique room code, try again");

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: hostName.trim().slice(0, 20),
        avatar: chosenAvatar,
        is_host: true,
      })
      .select()
      .single();
    if (playerError) throw playerError;

    return NextResponse.json({
      room: { code: room.code, category: room.category, numQuestions: room.num_questions },
      player: { id: player.id, name: player.name, avatar: player.avatar, token: player.client_token, isHost: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
