"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { useRoomChannel } from "@/hooks/useRoomChannel";
import { PublicPlayer, PublicRoom, RoomEvent } from "@/types/game";
import { PublicQuestion } from "@/lib/supabase/types";
import Lobby from "@/components/Lobby";
import GameRoom, { RevealState } from "@/components/GameRoom";
import Podium from "@/components/Podium";
import PixelHeading from "@/components/ui/PixelHeading";

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const router = useRouter();
  const { session, save, loaded } = usePlayerSession(code);

  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [finalPlayers, setFinalPlayers] = useState<PublicPlayer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const fetchRoom = useCallback(
    async (playerId?: string) => {
      const qs = playerId ? `?playerId=${playerId}` : "";
      const res = await fetch(`/api/rooms/${code}${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "Room not found");
        return;
      }
      setRoom(data.room);
      setPlayers(data.players);
      setQuestion(data.question);
      setHasAnswered(data.hasAnswered);
    },
    [code]
  );

  useEffect(() => {
    if (!loaded) return;
    if (!session) {
      router.replace("/");
      return;
    }
    fetchRoom(session.playerId);
  }, [loaded, session, fetchRoom, router]);

  const handleRealtimeEvent = useCallback(
    (event: RoomEvent) => {
      switch (event.type) {
        case "player_joined":
          setPlayers((prev) =>
            prev.some((p) => p.id === event.player.id) ? prev : [...prev, event.player]
          );
          break;
        case "player_left":
          setPlayers((prev) => prev.filter((p) => p.id !== event.playerId));
          break;
        case "question":
          setRoom(event.room);
          setQuestion(event.question);
          setHasAnswered(false);
          setReveal(null);
          break;
        case "scores": {
          setPlayers(event.players);
          // Host status can migrate (e.g. the original host left) — keep our
          // own session's isHost flag in sync so the Lobby's start control updates.
          const self = event.players.find((p) => p.id === session?.playerId);
          if (self && session && self.isHost !== session.isHost) {
            save({ ...session, isHost: self.isHost });
          }
          break;
        }
        case "question_ended":
          setPlayers(event.players);
          setReveal({
            questionIndex: event.questionIndex,
            correctIndex: event.correctIndex,
            revealedAt: Date.now(),
          });
          break;
        case "game_finished":
          setFinalPlayers(event.players);
          setRoom((r) => (r ? { ...r, status: "finished" } : r));
          break;
      }
    },
    [session, save]
  );

  // Resync full room state every time the realtime channel (re)connects —
  // covers both the initial connect race (a friend joining in the split
  // second before our socket finishes subscribing) and any reconnect after
  // a dropped connection, either of which would otherwise silently drop a
  // broadcast with no way to notice.
  const handleSubscribed = useCallback(() => {
    if (session) fetchRoom(session.playerId);
  }, [session, fetchRoom]);

  useRoomChannel(code, handleRealtimeEvent, handleSubscribed);

  // Mobile browsers in particular suspend background tabs' network
  // connections, so a realtime broadcast that fires while you're away (e.g.
  // you switched apps mid-question) can simply never arrive — there's
  // nothing to "catch up" on reconnect since broadcasts aren't replayed.
  // Rather than poll continuously, we do a single resync fetch whenever the
  // tab becomes visible again, which is enough to un-stick a client that
  // missed an event while backgrounded.
  useEffect(() => {
    if (!session) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchRoom(session.playerId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [session, fetchRoom]);

  // NOTE: we deliberately do NOT auto-remove a player on `pagehide` /
  // `beforeunload`. Those events fire far more often than "actually left
  // for good" — backgrounding a mobile browser, switching apps, even some
  // same-origin navigations — and doing so was silently deleting people
  // from the room (and reassigning host) just for tabbing away, which
  // looked like the game randomly resetting. Leaving is now only ever
  // explicit, via the Leave Room button below.

  const handleLeave = async () => {
    if (!session) return;
    try {
      await fetch(`/api/rooms/${code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: session.playerId, token: session.token }),
      });
    } finally {
      router.replace("/");
    }
  };

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
      // room/question state arrives via the realtime "question" broadcast
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

  if (room.status === "finished") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <Podium code={code} players={finalPlayers ?? players} selfId={session.playerId} />
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
          onLeave={handleLeave}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <GameRoom
        code={code}
        session={session}
        room={room}
        players={players}
        question={question}
        hasAnswered={hasAnswered}
        reveal={reveal}
        onAnswerSubmitted={() => setHasAnswered(true)}
      />
    </main>
  );
}
