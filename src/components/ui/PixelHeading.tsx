import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type NeonColor = "cyan" | "pink" | "green" | "gold" | "purple";

const textMap: Record<NeonColor, string> = {
  cyan: "text-neon-cyan text-shadow-neon-cyan",
  pink: "text-neon-pink text-shadow-neon-pink",
  green: "text-neon-green text-shadow-neon-green",
  gold: "text-neon-gold text-shadow-neon-gold",
  purple: "text-neon-purple text-shadow-neon-purple",
};

export default function PixelHeading({
  as: Tag = "h1",
  color = "pink",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  color?: NeonColor;
  className?: string;
  children: ReactNode;
}) {
  const size = Tag === "h1" ? "text-2xl md:text-4xl" : Tag === "h2" ? "text-lg md:text-2xl" : "text-sm md:text-base";
  return (
    <Tag
      className={cn(
        "font-pixel leading-relaxed animate-flicker",
        size,
        textMap[color],
        className
      )}
    >
      {children}
    </Tag>
  );
}
