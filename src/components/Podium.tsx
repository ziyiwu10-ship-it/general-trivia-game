"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import PixelHeading from "@/components/ui/PixelHeading";
import NeonPanel from "@/components/ui/NeonPanel";
import NeonButton from "@/components/ui/NeonButton";
import PlayerList from "@/components/PlayerList";
import { PublicPlayer } from "@/types/game";
import { cn } from "@/lib/utils";
import { playFinish } from "@/lib/sound";

const PODIUM_STYLES = [
  { place: 1, color: "gold", height: "h-40", order: "order-2" },
  { place: 2, color: "cyan", height: "h-28", order: "order-1" },
  { place: 3, color: "pink", height: "h-20", order: "order-3" },
] as const;

interface RecapItem {
  idx: number;
  question: string;
  choices: string[];
  correctIndex: number;
  correctAnswer: string;
  topic: string;
  learnMoreUrl: string;
}

export default function Podium({
  code,
  players,
  selfId,
}: {
  code: string;
  players: PublicPlayer[];
  selfId: string;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const [recap, setRecap] = useState<RecapItem[] | null>(null);
  const [showRecap, setShowRecap] = useState(false);

  useEffect(() => {
    playFinish();
  }, []);

  useEffect(() => {
    fetch(`/api/rooms/${code}/recap`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error(`[recap] request failed (${res.status}):`, body.error ?? res.statusText);
          return null;
        }
        return res.json();
      })
      .then((data) => data && setRecap(data.recap))
      .catch((err) => console.error("[recap] request threw:", err));
  }, [code]);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-xl px-4">
      <PixelHeading color="gold">Final Results</PixelHeading>

      <div className="flex items-end justify-center gap-4 w-full">
        {PODIUM_STYLES.map((style, i) => {
          const player = top3[style.place - 1];
          if (!player) return <div key={style.place} className="flex-1" />;
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 200, damping: 20 }}
              className={cn("flex-1 flex flex-col items-center gap-2", style.order)}
            >
              <span className="text-3xl leading-none">{player.avatar}</span>
              <span className="font-terminal text-xl truncate max-w-full">{player.name}</span>
              <span
                className={cn(
                  "font-pixel text-sm",
                  style.color === "gold" && "text-neon-gold",
                  style.color === "cyan" && "text-neon-cyan",
                  style.color === "pink" && "text-neon-pink"
                )}
              >
                {player.score}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-md border-2 flex items-start justify-center pt-2",
                  style.height,
                  style.color === "gold" && "border-neon-gold shadow-neon-gold bg-neon-gold/10",
                  style.color === "cyan" && "border-neon-cyan shadow-neon-cyan bg-neon-cyan/10",
                  style.color === "pink" && "border-neon-pink shadow-neon-pink bg-neon-pink/10"
                )}
              >
                <span className="font-pixel text-lg">{style.place}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <NeonPanel color="purple" className="w-full">
          <p className="font-pixel text-[10px] text-neon-purple mb-3">EVERYONE ELSE</p>
          <PlayerList players={rest} highlightId={selfId} showScores rankOffset={3} />
        </NeonPanel>
      )}

      {recap && recap.length > 0 && (
        <div className="w-full flex flex-col items-center gap-4">
          <NeonButton color="cyan" fullWidth onClick={() => setShowRecap((s) => !s)}>
            {showRecap ? "Hide Question Recap" : "Show Question Recap"}
          </NeonButton>

          <AnimatePresence>
            {showRecap && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full overflow-hidden"
              >
                <NeonPanel color="gold" className="w-full max-h-96 overflow-y-auto flex flex-col gap-4">
                  {recap.map((item) => (
                    <div key={item.idx} className="border-b border-arcade-border pb-3 last:border-b-0 last:pb-0">
                      <p className="font-pixel text-[9px] text-neon-purple mb-1">Q{item.idx + 1}</p>
                      <p className="font-terminal text-lg text-foreground/90">{item.question}</p>
                      <p className="font-terminal text-lg text-neon-green mt-1">
                        ✓ {item.correctAnswer}
                      </p>
                      <a
                        href={item.learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-pixel text-[9px] text-neon-cyan hover:text-shadow-neon-cyan underline underline-offset-4 inline-block mt-1"
                      >
                        Learn more on Wikipedia →
                      </a>
                    </div>
                  ))}
                </NeonPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Link href="/">
        <NeonButton color="green">Play Again</NeonButton>
      </Link>
    </div>
  );
}
