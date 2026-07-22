import { SupabaseClient } from "@supabase/supabase-js";
import { PlayerRow, RoomRow } from "@/lib/supabase/types";

export async function getRoomByCode(
  supabase: SupabaseClient,
  code: string
): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) {
    // Surface the real cause instead of silently reporting "not found" for
    // what might actually be a DB/permissions error.
    console.error("[getRoomByCode] query failed:", error.message);
    throw new Error(`Room lookup failed: ${error.message}`);
  }
  return (data as RoomRow) ?? null;
}

/** Validates that (playerId, token) identifies a real player in the given room. */
export async function authenticatePlayer(
  supabase: SupabaseClient,
  roomId: string,
  playerId: string,
  token: string
): Promise<PlayerRow | null> {
  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .eq("room_id", roomId)
    .eq("client_token", token)
    .maybeSingle();
  return (data as PlayerRow) ?? null;
}
