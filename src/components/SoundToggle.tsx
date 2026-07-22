"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted, startMusic } from "@/lib/sound";

export default function SoundToggle() {
  const [muted, setMutedState] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentlyMuted = isMuted();
    setMutedState(currentlyMuted);
    if (!currentlyMuted) startMusic();
  }, []);

  if (!mounted) return null;

  const toggle = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      className="fixed top-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-md border-2 border-neon-purple bg-arcade-panel/80 text-lg text-neon-purple shadow-neon-purple backdrop-blur-sm transition-transform hover:scale-105"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
