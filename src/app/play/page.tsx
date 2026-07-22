"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PixelHeading from "@/components/ui/PixelHeading";
import NeonPanel from "@/components/ui/NeonPanel";
import NeonButton from "@/components/ui/NeonButton";
import CategoryPicker from "@/components/CategoryPicker";
import QuestionScreen from "@/components/QuestionScreen";
import { calculatePoints } from "@/lib/scoring";
import type { GeneratedQuestion } from "@/lib/anthropic";

const SECONDS_PER_QUESTION = 20;

type Phase = "pick" | "playing" | "done";

export default function PlayPage() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [category, setCategory] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION);

  const questionStartRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleStart = useCallback(async (cat: string, numQuestions: number) => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, numQuestions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate questions");
      setQuestions(data.questions);
      setCategory(cat);
      setIndex(0);
      setScore(0);
      setPhase("playing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  }, []);

  const revealAnswer = useCallback(
    (chosenIndex: number | null) => {
      if (tickRef.current) clearInterval(tickRef.current);
      const q = questions[index];
      const isCorrect = chosenIndex !== null && chosenIndex === q.correctIndex;
      const timeMs = Date.now() - questionStartRef.current;
      const points = calculatePoints(isCorrect, timeMs, SECONDS_PER_QUESTION);
      setLastPoints(points);
      setScore((s) => s + points);
      setRevealed(true);
    },
    [index, questions]
  );

  // start timer whenever a new question comes up
  useEffect(() => {
    if (phase !== "playing") return;
    setSelected(null);
    setRevealed(false);
    setLastPoints(null);
    setSecondsLeft(SECONDS_PER_QUESTION);
    questionStartRef.current = Date.now();

    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 0.1;
        if (next <= 0) {
          if (tickRef.current) clearInterval(tickRef.current);
          revealAnswer(null);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase]);

  const handleSelect = (i: number) => {
    if (selected !== null || revealed) return;
    setSelected(i);
    revealAnswer(i);
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setPhase("done");
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (phase === "pick") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <PixelHeading color="pink">Trivia Battle Royale</PixelHeading>
        <CategoryPicker onStart={handleStart} starting={starting} error={error} />
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <PixelHeading color="gold">Game Over</PixelHeading>
        <NeonPanel color="gold" glow className="text-center">
          <p className="font-terminal text-2xl text-neon-gold">Final Score</p>
          <p className="font-pixel text-3xl text-neon-gold mt-2">{score}</p>
        </NeonPanel>
        <NeonButton color="cyan" onClick={() => setPhase("pick")}>
          Play Again
        </NeonButton>
      </main>
    );
  }

  const q = questions[index];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="font-pixel text-sm text-neon-gold">SCORE: {score}</div>
      <QuestionScreen
        category={category}
        questionIndex={index}
        totalQuestions={questions.length}
        questionText={q.question}
        choices={q.choices}
        secondsLeft={secondsLeft}
        totalSeconds={SECONDS_PER_QUESTION}
        selectedIndex={selected}
        revealed={revealed}
        correctIndex={revealed ? q.correctIndex : null}
        onSelect={handleSelect}
        lastPointsAwarded={lastPoints}
      />
      {revealed && (
        <NeonButton color="green" onClick={handleNext}>
          {index + 1 >= questions.length ? "See Results" : "Next Question"}
        </NeonButton>
      )}
    </main>
  );
}
