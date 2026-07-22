"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { roomChannelName } from "@/lib/realtime";
import { RoomEvent } from "@/types/game";

/**
 * Subscribes to a room's realtime broadcast channel for the lifetime of the
 * component. Broadcasts have no history/replay — a client only receives
 * events sent after its websocket finishes joining the channel, so anything
 * fired during that initial connect window (or during a reconnect after a
 * network blip) is silently lost. `onSubscribed` fires every time the
 * channel reaches SUBSCRIBED (including reconnects) so the caller can
 * resync full state right afterward and self-heal from that gap.
 */
export function useRoomChannel(
  code: string,
  onEvent: (event: RoomEvent) => void,
  onSubscribed?: () => void
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const subscribedRef = useRef(onSubscribed);
  subscribedRef.current = onSubscribed;

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(roomChannelName(code))
      .on("broadcast", { event: "game" }, ({ payload }) => {
        handlerRef.current(payload as RoomEvent);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") subscribedRef.current?.();
      });

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [code]);
}
