"use client";

import PixelHeading from "@/components/ui/PixelHeading";
import NeonPanel from "@/components/ui/NeonPanel";
import NeonButton from "@/components/ui/NeonButton";
import PlayerList from "@/components/PlayerList";
import { PublicPlayer, PublicRoom } from "@/types/game";

export default function Lobby({
  room,
  players,
  isHost,
  selfId,
  onStart,
  starting,
  error,
}: {
  room: PublicRoom;
  players: PublicPlayer[];
  isHost: boolean;
  selfId: string;
  onStart: () => void;
  starting: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md px-4">
      <div className="text-center">
        <p className="font-pixel text-[10px] text-neon-purple mb-2">ROOM CODE</p>
        <PixelHeading color="gold">{room.code}</PixelHeading>
      </div>

      <NeonPanel color="cyan" className="w-full text-center">
        <p className="font-terminal text-xl text-neon-cyan">
          {room.category} &middot; {room.numQuestions} questions
        </p>
      </NeonPanel>

      <PlayerList players={players} highlightId={selfId} />

      {error && <p className="font-terminal text-lg text-neon-pink">{error}</p>}

      {isHost ? (
        <NeonButton color="green" fullWidth disabled={starting} onClick={onStart}>
          {starting ? "Generating Questions..." : "Start Game"}
        </NeonButton>
      ) : (
        <p className="font-terminal text-xl text-neon-purple animate-flicker">
          Waiting for host to start...
        </p>
      )}
    </div>
  );
}
