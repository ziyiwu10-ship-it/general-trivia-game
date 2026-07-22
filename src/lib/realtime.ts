import { supabaseServer } from "@/lib/supabase/server";
import { RoomEvent } from "@/types/game";

export function roomChannelName(code: string) {
  return `room:${code.toUpperCase()}`;
}

/**
 * Server-side broadcast — pushes a game-state event to everyone subscribed
 * to this room's channel. Sends over Supabase's broadcast REST endpoint
 * (no websocket join needed) since this runs per-request in a route handler.
 */
export async function broadcastToRoom(code: string, event: RoomEvent) {
  const channel = supabaseServer().channel(roomChannelName(code));
  await channel.send({ type: "broadcast", event: "game", payload: event });
}
