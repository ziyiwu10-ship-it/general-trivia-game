"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NeonPanel from "@/components/ui/NeonPanel";
import NeonButton from "@/components/ui/NeonButton";
import PixelHeading from "@/components/ui/PixelHeading";
import CategoryPicker from "@/components/CategoryPicker";
import AvatarPicker from "@/components/AvatarPicker";
import { savePlayerSession } from "@/hooks/usePlayerSession";
import { DEFAULT_AVATAR } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Mode = "menu" | "create" | "join";

export default function JoinCreateForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(category: string, numQuestions: number, secondsPerQuestion: number) {
    if (!name.trim()) {
      setError("Enter your name first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name, category, numQuestions, secondsPerQuestion, avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create room");

      savePlayerSession(data.room.code, {
        playerId: data.player.id,
        token: data.player.token,
        name: data.player.name,
        isHost: true,
      });
      router.push(`/room/${data.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) {
      setError("Enter your name first");
      return;
    }
    if (!code.trim()) {
      setError("Enter a room code");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const roomCode = code.trim().toUpperCase();
      const res = await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join room");

      savePlayerSession(roomCode, {
        playerId: data.player.id,
        token: data.player.token,
        name: data.player.name,
        isHost: false,
      });
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (mode === "menu") {
    return (
      <NeonPanel color="purple" glow className="w-full max-w-md flex flex-col gap-6">
        <div>
          <label className="font-pixel text-[10px] text-neon-cyan">Your Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Player One"
            className="mt-2 w-full rounded-md border-2 border-arcade-border bg-arcade-bg px-4 py-3 font-terminal text-xl text-foreground outline-none focus:border-neon-cyan focus:shadow-neon-cyan"
          />
        </div>
        <AvatarPicker value={avatar} onChange={setAvatar} />
        {error && <p className="font-terminal text-lg text-neon-pink">{error}</p>}
        <div className="flex flex-col gap-4">
          <NeonButton color="green" fullWidth onClick={() => setMode("create")}>
            Create Room
          </NeonButton>
          <NeonButton color="purple" fullWidth onClick={() => setMode("join")}>
            Join Room
          </NeonButton>
        </div>
      </NeonPanel>
    );
  }

  if (mode === "join") {
    return (
      <NeonPanel color="cyan" glow className="w-full max-w-md flex flex-col gap-6">
        <PixelHeading as="h2" color="cyan">
          Join Room
        </PixelHeading>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          placeholder="TRIV42"
          className={cn(
            "w-full rounded-md border-2 border-arcade-border bg-arcade-bg px-4 py-3 font-pixel text-xl tracking-widest text-neon-cyan outline-none focus:border-neon-cyan focus:shadow-neon-cyan text-center"
          )}
        />
        {error && <p className="font-terminal text-lg text-neon-pink">{error}</p>}
        <div className="flex gap-4">
          <NeonButton color="purple" onClick={() => setMode("menu")} disabled={busy}>
            Back
          </NeonButton>
          <NeonButton color="cyan" fullWidth onClick={handleJoin} disabled={busy}>
            {busy ? "Joining..." : "Join"}
          </NeonButton>
        </div>
      </NeonPanel>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <CategoryPicker onStart={handleCreate} starting={busy} error={error} />
      <NeonButton color="purple" onClick={() => setMode("menu")} disabled={busy}>
        Back
      </NeonButton>
    </div>
  );
}
