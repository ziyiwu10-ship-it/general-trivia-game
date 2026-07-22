"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QuestionScreen from "@/components/QuestionScreen";
import PlayerList from "@/components/PlayerList";
import { PlayerSession } from "@/hooks/usePlayerSession";
import { PublicPlayer, PublicRoom } from "@/types/game";
import { PublicQuestion } from "@/lib/supabase/types";

const REVEAL_WINDOW_MS = 4000;

export interface RevealState {
  questionIndex: number;
  correctIndex: number;
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
  const nextFiredRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authBody = { playerId: session.playerId, token: session.token };

  const callReveal = useCallback(
    (questionIndex: number) => {
      fetch(`/api/rooms/${code}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authBody, questionIndex }),
      }).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, session.playerId, session.token]
  );

  const callNext = useCallback(
    (questionIndex: number) => {
      fetch(`/api/rooms/${code}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...authBody, questionIndex }),
      }).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, session.playerId, session.token]
  );

  // Reset interaction state whenever a new question comes in.
  useEffect(() => {
    setSelected(null);
    setLastPoints(null);
    revealFiredRef.current = false;
    nextFiredRef.current = false;
  }, [question?.id]);

  // Server-authoritative countdown: every connected client derives the same
  // remaining time from questionStartedAt, then races (harmlessly, since the
  // server re-checks elapsed time) to call /reveal once it hits zero.
  useEffect(() => {
    if (!room.questionStartedAt || reveal) return;
    const startedAt = new Date(room.questionStartedAt).getTime();

    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, room.secondsPerQuestion - elapsed);
      setSecondsLeft(left);
      if (left <= 0 && !revealFiredRef.current) {
        revealFiredRef.current = true;
        setTimeout(() => callReveal(room.currentQuestionIndex), Math.random() * 400);
      }
    };
    tick();
    tickRef.current = setInterval(tick, 100);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [room.questionStartedAt, room.secondsPerQuestion, room.currentQuestionIndex, reveal, callReveal]);

  // Once revealed, every client races (harmlessly) to advance after the reveal window.
  useEffect(() => {
    if (!reveal || nextFiredRef.current) return;
    nextFiredRef.current = true;
    const timeout = setTimeout(() => callNext(reveal.questionIndex), REVEAL_WINDOW_MS);
    return () => clearTimeout(timeout);
  }, [reveal, callNext]);

  const handleSelect = async (choiceIndex: number) => {
    if (selected !== null || reveal || hasAnswered || !question) return;
    setSelected(choiceIndex);
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
