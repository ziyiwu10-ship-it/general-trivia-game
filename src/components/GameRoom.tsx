"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QuestionScreen from "@/components/QuestionScreen";
import PlayerList from "@/components/PlayerList";
import { PlayerSession } from "@/hooks/usePlayerSession";
import { PublicPlayer, PublicRoom } from "@/types/game";
import { PublicQuestion } from "@/lib/supabase/types";
import { playClick, playCorrect, playTick, playWrong } from "@/lib/sound";

const REVEAL_WINDOW_MS = 4000;
const RETRY_COOLDOWN_MS = 1500;

export interface RevealState {
  questionIndex: number;
  correctIndex: number;
  /** Client-side timestamp when this reveal was received, used to schedule the advance-to-next timer. */
  revealedAt: number;
}

interface GameRoomProps {
  code: string;
  session: PlayerSession;
  room: PublicRoom;
  players: PublicPlayer[];
  question: PublicQuestion | null;
  hasAnswered: boolean;
  reveal: RevealState | null;
  onAnswerSubmitted: (points: number) => void;
}

export default function GameRoom({
  code,
  session,
  room,
  players,
  question,
  hasAnswered,
  reveal,
  onAnswerSubmitted,
}: GameRoomProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(room.secondsPerQuestion);

  const revealFiredRef = useRef(false);
  const revealLastAttemptRef = useRef(0);
  const nextFiredRef = useRef(false);
  const nextLastAttemptRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTickSoundRef = useRef<number | null>(null);
  const revealSoundFiredRef = useRef(false);

  const authBody = { playerId: session.playerId, token: session.token };

  // Both of these are single fire-and-forget calls racing against other
  // clients — but if this browser happens to be the only one (or the only
  // one still connected) and its one attempt fails for any reason (a
  // transient network blip, a cold-start timing hiccup), nothing used to
  // retry it, silently stranding the room "active" in the database forever
  // even though the client had already moved on locally. Both now check the
  // response and, on failure, clear their "fired" ref so the driving
  // tick/check loop (already running every 100-200ms) tries again shortly.

  const callReveal = useCallback(
    async (questionIndex: number) => {
      try {
        const res = await fetch(`/api/rooms/${code}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...authBody, questionIndex }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error(`[reveal] failed (${res.status}):`, body.error);
          revealFiredRef.current = false;
        }
      } catch (err) {
        console.error("[reveal] request threw:", err);
        revealFiredRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, session.playerId, session.token]
  );

  const callNext = useCallback(
    async (questionIndex: number) => {
      try {
        const res = await fetch(`/api/rooms/${code}/next`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...authBody, questionIndex }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error(`[next] failed (${res.status}):`, body.error);
          nextFiredRef.current = false;
        }
      } catch (err) {
        console.error("[next] request threw:", err);
        nextFiredRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, session.playerId, session.token]
  );

  // Reset interaction state whenever a new question comes in.
  useEffect(() => {
    setSelected(null);
    setLastPoints(null);
    revealFiredRef.current = false;
    revealLastAttemptRef.current = 0;
    nextFiredRef.current = false;
    nextLastAttemptRef.current = 0;
    revealSoundFiredRef.current = false;
    lastTickSoundRef.current = null;
  }, [question?.id]);

  // Server-authoritative countdown: every connected client derives the same
  // remaining time from questionStartedAt, then races (harmlessly, since the
  // server re-checks elapsed time) to call /reveal once it hits zero.
  //
  // Browsers throttle setInterval heavily in backgrounded tabs (mobile in
  // particular — switching apps, locking the screen), so a tab that's put
  // away for a while can miss its own tick entirely and look "frozen" when
  // you come back. Rather than trust the interval alone, we compute an
  // absolute target time and re-check it immediately on every
  // visibilitychange, so tabbing back in catches things up right away
  // instead of waiting on a throttled timer.
  useEffect(() => {
    if (!room.questionStartedAt || reveal) return;
    const target = new Date(room.questionStartedAt).getTime() + room.secondsPerQuestion * 1000;

    const tick = () => {
      const left = Math.max(0, (target - Date.now()) / 1000);
      setSecondsLeft(left);
      const wholeSecond = Math.ceil(left);
      if (wholeSecond <= 5 && wholeSecond > 0 && lastTickSoundRef.current !== wholeSecond) {
        lastTickSoundRef.current = wholeSecond;
        playTick();
      }
      if (
        left <= 0 &&
        !revealFiredRef.current &&
        Date.now() - revealLastAttemptRef.current > RETRY_COOLDOWN_MS
      ) {
        revealFiredRef.current = true;
        revealLastAttemptRef.current = Date.now();
        setTimeout(() => callReveal(room.currentQuestionIndex), Math.random() * 400);
      }
    };
    tick();
    tickRef.current = setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [room.questionStartedAt, room.secondsPerQuestion, room.currentQuestionIndex, reveal, callReveal]);

  // Once revealed, every client races (harmlessly) to advance after the
  // reveal window — same throttling concern as above, so this checks an
  // absolute target on an interval plus visibilitychange instead of relying
  // on a single setTimeout.
  useEffect(() => {
    if (!reveal) return;
    const target = reveal.revealedAt + REVEAL_WINDOW_MS;

    const check = () => {
      if (nextFiredRef.current) return;
      if (Date.now() >= target && Date.now() - nextLastAttemptRef.current > RETRY_COOLDOWN_MS) {
        nextFiredRef.current = true;
        nextLastAttemptRef.current = Date.now();
        callNext(reveal.questionIndex);
      }
    };
    check();
    const interval = setInterval(check, 200);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, [reveal, callNext]);

  // Play a correct/wrong sting the moment this player's own outcome is known.
  useEffect(() => {
    if (!reveal || revealSoundFiredRef.current) return;
    if (reveal.questionIndex !== room.currentQuestionIndex) return;
    revealSoundFiredRef.current = true;
    if (selected !== null && selected === reveal.correctIndex) playCorrect();
    else playWrong();
  }, [reveal, selected, room.currentQuestionIndex]);

  const handleSelect = async (choiceIndex: number) => {
    if (selected !== null || reveal || hasAnswered || !question) return;
    setSelected(choiceIndex);
    playClick();
    onAnswerSubmitted(0); // optimistically mark answered so the UI locks immediately
    try {
      const res = await fetch(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authBody, questionId: question.id, choiceIndex }),
      });
      const data = await res.json();
      if (res.ok && typeof data.points === "number") {
        setLastPoints(data.points);
      }
    } catch {
      // scores still sync via the next broadcast even if this request hiccups
    }
  };

  if (!question) {
    return (
      <p className="font-terminal text-2xl text-neon-cyan animate-flicker">
        Waiting for the next question...
      </p>
    );
  }

  const revealed = !!reveal && reveal.questionIndex === room.currentQuestionIndex;

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <QuestionScreen
        category={room.category}
        questionIndex={room.currentQuestionIndex}
        totalQuestions={room.numQuestions}
        questionText={question.question}
        choices={question.choices}
        secondsLeft={secondsLeft}
        totalSeconds={room.secondsPerQuestion}
        selectedIndex={selected}
        revealed={revealed}
        correctIndex={revealed ? reveal!.correctIndex : null}
        onSelect={handleSelect}
        lastPointsAwarded={revealed ? lastPoints : null}
      />
      <PlayerList players={players} highlightId={session.playerId} showScores />
    </div>
  );
}
