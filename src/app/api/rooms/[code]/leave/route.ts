import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { authenticatePlayer, getRoomByCode } from "@/lib/roomAuth";
import { broadcastToRoom } from "@/lib/realtime";
import { toPublicPlayer } from "@/types/game";
import { PlayerRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * Explicit leave, fired from a "Leave Room" click or a beforeunload/pagehide
 * beacon. If the host leaves, host status migrates to whoever joined
 * earliest next so the room isn't stranded — reveal/next during an active
 * game don't require the host at all (any player can trigger them once the
 * timer elapses), so this only matters for starting a still-lobby room.
 */
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const { playerId, token } = await req.json();
    const supabase = supabaseServer();

    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const player = await authenticatePlayer(supabase, room.id, playerId, token);
    if (!player) return NextResponse.json({ ok: true });

    await supabase.from("players").delete().eq("id", player.id);
    await broadcastToRoom(room.code, { type: "player_left", playerId: player.id });

    if (player.is_host) {
      const { data: nextHost } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextHost) {
        await supabase.from("players").update({ is_host: true }).eq("id", nextHost.id);

        const { data: allPlayers } = await supabase.from("players").select("*").eq("room_id", room.id);
        await broadcastToRoom(room.code, {
          type: "scores",
          players: ((allPlayers as PlayerRow[]) ?? []).map(toPublicPlayer),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to leave room";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
