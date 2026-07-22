"use client";

import { useCallback, useEffect, useState } from "react";

export interface PlayerSession {
  playerId: string;
  token: string;
  name: string;
  isHost: boolean;
}

function storageKey(roomCode: string) {
  return `trivia:${roomCode.toUpperCase()}`;
}

export function loadPlayerSession(roomCode: string): PlayerSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey(roomCode));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function savePlayerSession(roomCode: string, session: PlayerSession) {
  window.localStorage.setItem(storageKey(roomCode), JSON.stringify(session));
}

export function clearPlayerSession(roomCode: string) {
  window.localStorage.removeItem(storageKey(roomCode));
}

/** Reads (and keeps in sync) the current player's identity for a room from localStorage. */
export function usePlayerSession(roomCode: string) {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSession(loadPlayerSession(roomCode));
    setLoaded(true);
  }, [roomCode]);

  const save = useCallback(
    (s: PlayerSession) => {
      savePlayerSession(roomCode, s);
      setSession(s);
    },
    [roomCode]
  );

  return { session, save, loaded };
}
