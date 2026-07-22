"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PublicPlayer } from "@/types/game";
import NeonPanel from "@/components/ui/NeonPanel";
import { cn } from "@/lib/utils";

export default function PlayerList({
  players,
  highlightId,
  showScores = false,
}: {
  players: PublicPlayer[];
  highlightId?: string;
  showScores?: boolean;
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
                {showScores && <span className="font-pixel text-[10px] text-neon-gold">#{i + 1}</span>}
                {p.name}
                {p.isHost && <span className="font-pixel text-[9px] text-neon-green">HOST</span>}
                {!p.connected && <span className="font-pixel text-[9px] text-neon-pink">OFFLINE</span>}
              </span>
              {showScores && <span className="font-pixel text-sm text-neon-gold">{p.score}</span>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </NeonPanel>
  );
}
