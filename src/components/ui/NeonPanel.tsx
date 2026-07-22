import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type NeonColor = "cyan" | "pink" | "green" | "gold" | "purple";

const borderMap: Record<NeonColor, string> = {
  cyan: "border-neon-cyan shadow-neon-cyan",
  pink: "border-neon-pink shadow-neon-pink",
  green: "border-neon-green shadow-neon-green",
  gold: "border-neon-gold shadow-neon-gold",
  purple: "border-neon-purple shadow-neon-purple",
};

export default function NeonPanel({
  color = "purple",
  glow = false,
  className,
  children,
}: {
  color?: NeonColor;
  glow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-arcade-panel/80 backdrop-blur-sm p-6",
        borderMap[color].split(" ")[0],
        glow && borderMap[color].split(" ")[1],
        className
      )}
    >
      {children}
    </div>
  );
}
