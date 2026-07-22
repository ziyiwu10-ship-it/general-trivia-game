"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PublicPlayer } from "@/types/game";
import NeonPanel from "@/components/ui/NeonPanel";
import { cn } from "@/lib/utils";

export default function PlayerList({
  players,
  highlightId,
  showScores = false,
  rankOffset = 0,
}: {
  players: PublicPlayer[];
  highlightId?: string;
  showScores?: boolean;
  /** Starting rank for the first row, for lists that continue a ranking started elsewhere (e.g. "everyone else" below a podium). */
  rankOffset?: number;
}) {
  const sorted = showScores ? [...players].sort((a, b) => b.score - a.score) : players;

  return (
    <NeonPanel color="purple" className="w-full max-w-md">
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {sorted.map((p, i) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className={cn(
                "flex items-center justify-between rounded-md border-2 px-4 py-2 font-terminal text-xl",
                p.id === highlightId
                  ? "border-neon-cyan shadow-neon-cyan text-neon-cyan"
                  : "border-arcade-border text-foreground/90",
                !p.connected && "opacity-40"
              )}
            >
              <span className="flex items-center gap-2">
                {showScores && (
                  <span className="font-pixel text-[10px] text-neon-gold">
                    #{rankOffset + i + 1}
                  </span>
                )}
                <span className="text-xl leading-none">{p.avatar}</span>
                {p.name}
                {p.isHost && <span className="font-pixel text-[9px] text-neon-green">HOST</span>}
                {!p.connected && <span className="font-pixel text-[9px] text-neon-pink">OFFLINE</span>}
              </span>
              {showScores && (
                <motion.span
                  key={p.score}
                  initial={{ scale: 1.5, color: "#39ff14", textShadow: "0 0 12px #39ff14" }}
                  animate={{ scale: 1, color: "#ffd93e", textShadow: "0 0 5px #ffd93e" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="font-pixel text-sm"
                >
                  {p.score}
                </motion.span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </NeonPanel>
  );
}
