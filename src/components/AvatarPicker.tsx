"use client";

import { AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export default function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (avatar: string) => void;
}) {
  return (
    <div>
      <label className="font-pixel text-[10px] text-neon-cyan">Avatar</label>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {AVATARS.map((avatar) => {
          const active = value === avatar;
          return (
            <button
              key={avatar}
              type="button"
              onClick={() => onChange(avatar)}
              aria-label={`Choose avatar ${avatar}`}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-md border-2 text-2xl transition-all",
                active
                  ? "border-neon-cyan shadow-neon-cyan bg-arcade-panel"
                  : "border-arcade-border hover:border-neon-purple/60"
              )}
            >
              {avatar}
            </button>
          );
        })}
      </div>
    </div>
  );
}
