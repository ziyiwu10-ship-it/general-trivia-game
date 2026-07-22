"use client";

import { useState } from "react";
import NeonPanel from "@/components/ui/NeonPanel";
import NeonButton from "@/components/ui/NeonButton";
import PixelHeading from "@/components/ui/PixelHeading";
import { CATEGORIES } from "@/types/game";
import { cn } from "@/lib/utils";

const COLORS = ["cyan", "pink", "green", "gold", "purple"] as const;

const ACTIVE_CLASSES: Record<(typeof COLORS)[number], string> = {
  cyan: "border-neon-cyan shadow-neon-cyan text-neon-cyan bg-arcade-panel",
  pink: "border-neon-pink shadow-neon-pink text-neon-pink bg-arcade-panel",
  green: "border-neon-green shadow-neon-green text-neon-green bg-arcade-panel",
  gold: "border-neon-gold shadow-neon-gold text-neon-gold bg-arcade-panel",
  purple: "border-neon-purple shadow-neon-purple text-neon-purple bg-arcade-panel",
};

export default function CategoryPicker({
  onStart,
  starting,
  error,
}: {
  onStart: (category: string, numQuestions: number) => void;
  starting?: boolean;
  error?: string | null;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [numQuestions, setNumQuestions] = useState(10);

  return (
    <NeonPanel color="pink" glow className="w-full max-w-lg flex flex-col gap-6">
      <PixelHeading as="h2" color="pink">
        Pick a Category
      </PixelHeading>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-md border-2 px-3 py-3 font-terminal text-lg transition-all",
                active
                  ? ACTIVE_CLASSES[color]
                  : "border-arcade-border text-foreground/70 hover:border-neon-purple/60"
              )}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between font-terminal text-xl">
        <label htmlFor="numQuestions" className="text-neon-cyan">
          Questions: {numQuestions}
        </label>
        <input
          id="numQuestions"
          type="range"
          min={5}
          max={20}
          value={numQuestions}
          onChange={(e) => setNumQuestions(Number(e.target.value))}
          className="w-40 accent-[#2de2e6]"
        />
      </div>

      {error && <p className="font-terminal text-lg text-neon-pink">{error}</p>}

      <NeonButton
        color="green"
        fullWidth
        disabled={starting}
        onClick={() => onStart(category, numQuestions)}
      >
        {starting ? "Generating..." : "Start Game"}
      </NeonButton>
    </NeonPanel>
  );
}
