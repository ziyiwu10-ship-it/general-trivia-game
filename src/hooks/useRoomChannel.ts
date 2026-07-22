"use client";

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { roomChannelName } from "@/lib/realtime";
import { RoomEvent } from "@/types/game";

/** Subscribes to a room's realtime broadcast channel for the lifetime of the component. */
export function useRoomChannel(code: string, onEvent: (event: RoomEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(roomChannelName(code))
      .on("broadcast", { event: "game" }, ({ payload }) => {
        handlerRef.current(payload as RoomEvent);
      })
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [code]);
}
