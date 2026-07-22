"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { PublicPlayer, PublicRoom } from "@/types/game";
import Lobby from "@/components/Lobby";
import PixelHeading from "@/components/ui/PixelHeading";

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const router = useRouter();
  const { session, loaded } = usePlayerSession(code);

  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error ?? "Room not found");
      return;
    }
    setRoom(data.room);
    setPlayers(data.players);
  }, [code]);

  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      router.replace("/");
      return;
    }
    fetchRoom();
  }, [loaded, session, fetchRoom, router]);

  const handleStart = async () => {
    if (!session) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: session.playerId, token: session.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start game");
      await fetchRoom();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  };

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <PixelHeading color="pink">{loadError}</PixelHeading>
      </main>
    );
  }

  if (!loaded || !session || !room) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <p className="font-terminal text-2xl text-neon-cyan animate-flicker">Loading room...</p>
      </main>
    );
  }

  if (room.status === "lobby") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <Lobby
          room={room}
          players={players}
          isHost={session.isHost}
          selfId={session.playerId}
          onStart={handleStart}
          starting={starting}
          error={startError}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <PixelHeading color="cyan">Game in progress</PixelHeading>
      <p className="font-terminal text-xl text-neon-purple">
        Live question sync coming online next.
      </p>
    </main>
  );
}
