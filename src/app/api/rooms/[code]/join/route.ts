import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoomByCode } from "@/lib/roomAuth";
import { broadcastToRoom } from "@/lib/realtime";
import { toPublicPlayer } from "@/types/game";
import { AVATARS, DEFAULT_AVATAR } from "@/lib/avatars";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { name, avatar } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const chosenAvatar = AVATARS.includes(avatar) ? avatar : DEFAULT_AVATAR;

    const supabase = supabaseServer();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Joins are blocked once a game is underway or finished: mid-game scoring/timer
    // state would be ambiguous for a late joiner, and for a small friend-group game
    // it's simpler to just have latecomers wait for the next room. Rejoining an
    // existing room you already joined (e.g. after a refresh) is handled client-side
    // via the stored player token, not through this endpoint.
    if (room.status !== "lobby") {
      return NextResponse.json(
        { error: "This game has already started. Ask the host for a new room." },
        { status: 409 }
      );
    }

    const { data: player, error } = await supabase
      .from("players")
      .insert({ room_id: room.id, name: name.trim().slice(0, 20), avatar: chosenAvatar })
      .select()
      .single();
    if (error) throw error;

    await broadcastToRoom(room.code, { type: "player_joined", player: toPublicPlayer(player) });

    return NextResponse.json({
      room: { code: room.code, category: room.category, numQuestions: room.num_questions },
      player: { id: player.id, name: player.name, avatar: player.avatar, token: player.client_token, isHost: false },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
