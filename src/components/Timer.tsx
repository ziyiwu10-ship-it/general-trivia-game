"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Timer({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number;
  totalSeconds: number;
}) {
  const frac = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const urgent = frac <= 0.25;
  const warn = frac <= 0.5 && !urgent;

  const color = urgent ? "#ff2bd6" : warn ? "#ffd93e" : "#2de2e6";

  return (
    <div className="w-full max-w-md">
      <div className="flex justify-between items-center mb-1 font-pixel text-[10px]">
        <span style={{ color }}>TIME</span>
        <span style={{ color }}>{Math.ceil(secondsLeft)}s</span>
      </div>
      <div className="h-4 rounded-sm border-2 border-arcade-border bg-arcade-panel overflow-hidden">
        <motion.div
          className={cn("h-full", urgent && "animate-flicker")}
          animate={{ width: `${frac * 100}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          transition={{ ease: "linear", duration: 0.2 }}
        />
      </div>
    </div>
  );
}
