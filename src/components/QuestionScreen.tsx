"use client";

import { AnimatePresence, motion } from "framer-motion";
import PixelHeading from "@/components/ui/PixelHeading";
import NeonPanel from "@/components/ui/NeonPanel";
import Timer from "@/components/Timer";
import AnswerButton from "@/components/AnswerButton";

interface QuestionScreenProps {
  category: string;
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  choices: string[];
  secondsLeft: number;
  totalSeconds: number;
  selectedIndex: number | null;
  revealed: boolean;
  correctIndex: number | null;
  onSelect: (index: number) => void;
  lastPointsAwarded?: number | null;
}

export default function QuestionScreen({
  category,
  questionIndex,
  totalQuestions,
  questionText,
  choices,
  secondsLeft,
  totalSeconds,
  selectedIndex,
  revealed,
  correctIndex,
  onSelect,
  lastPointsAwarded,
}: QuestionScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">
      <div className="flex justify-between items-center w-full font-pixel text-[10px] text-neon-purple">
        <span>{category.toUpperCase()}</span>
        <span>
          Q{questionIndex + 1} / {totalQuestions}
        </span>
      </div>

      <Timer secondsLeft={secondsLeft} totalSeconds={totalSeconds} />

      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="w-full flex flex-col items-center gap-6"
        >
          <NeonPanel color="purple" glow className="w-full text-center">
            <PixelHeading as="h2" color="cyan" className="!animate-none leading-relaxed">
              {questionText}
            </PixelHeading>
          </NeonPanel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {choices.map((choice, i) => (
              <AnswerButton
                key={i}
                index={i}
                text={choice}
                selected={selectedIndex === i}
                disabled={selectedIndex !== null || revealed}
                revealed={revealed}
                isCorrectAnswer={correctIndex === i}
                onSelect={() => onSelect(i)}
              />
            ))}
          </div>

          {revealed && (
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`font-pixel text-sm ${
                lastPointsAwarded ? "text-neon-green" : "text-neon-pink"
              }`}
            >
              {lastPointsAwarded ? `+${lastPointsAwarded} PTS` : "NO POINTS"}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
