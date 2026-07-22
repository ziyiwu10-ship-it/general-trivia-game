"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];
const COLORS = ["cyan", "pink", "green", "gold"] as const;
const COLOR_CLASSES: Record<(typeof COLORS)[number], { border: string; text: string; shadow: string }> = {
  cyan: { border: "border-neon-cyan", text: "text-neon-cyan", shadow: "hover:shadow-neon-cyan" },
  pink: { border: "border-neon-pink", text: "text-neon-pink", shadow: "hover:shadow-neon-pink" },
  green: { border: "border-neon-green", text: "text-neon-green", shadow: "hover:shadow-neon-green" },
  gold: { border: "border-neon-gold", text: "text-neon-gold", shadow: "hover:shadow-neon-gold" },
};

interface AnswerButtonProps {
  index: number;
  text: string;
  onSelect: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Set once the answer is revealed */
  isCorrectAnswer?: boolean;
  revealed?: boolean;
}

export default function AnswerButton({
  index,
  text,
  onSelect,
  disabled,
  selected,
  isCorrectAnswer,
  revealed,
}: AnswerButtonProps) {
  const color = COLOR_CLASSES[COLORS[index % 4]];

  let stateClasses = "bg-arcade-panel/60";
  if (revealed) {
    if (isCorrectAnswer) {
      stateClasses = "bg-neon-green/20 border-neon-green shadow-neon-green";
    } else if (selected) {
      stateClasses = "bg-neon-pink/20 border-neon-pink shadow-neon-pink";
    } else {
      stateClasses = "bg-arcade-panel/30 opacity-50";
    }
  } else if (selected) {
    stateClasses = cn("bg-arcade-panel", color.shadow.replace("hover:", ""));
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 w-full rounded-md border-2 px-4 py-4 text-left transition-colors duration-150",
        !revealed && color.border,
        !revealed && color.shadow,
        !revealed && !selected && "bg-arcade-panel/60",
        revealed && "border-2",
        stateClasses,
        disabled && !revealed && "cursor-not-allowed opacity-60"
      )}
    >
      <span className={cn("font-pixel text-xs shrink-0", !revealed && color.text)}>
        {LETTERS[index]}
      </span>
      <span className="font-terminal text-xl">{text}</span>
    </motion.button>
  );
}
