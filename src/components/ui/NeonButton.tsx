"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type NeonColor = "cyan" | "pink" | "green" | "gold" | "purple";

const colorMap: Record<
  NeonColor,
  { border: string; text: string; shadow: string; hoverBg: string }
> = {
  cyan: {
    border: "border-neon-cyan",
    text: "text-neon-cyan",
    shadow: "hover:shadow-neon-cyan focus:shadow-neon-cyan",
    hoverBg: "hover:bg-neon-cyan/10",
  },
  pink: {
    border: "border-neon-pink",
    text: "text-neon-pink",
    shadow: "hover:shadow-neon-pink focus:shadow-neon-pink",
    hoverBg: "hover:bg-neon-pink/10",
  },
  green: {
    border: "border-neon-green",
    text: "text-neon-green",
    shadow: "hover:shadow-neon-green focus:shadow-neon-green",
    hoverBg: "hover:bg-neon-green/10",
  },
  gold: {
    border: "border-neon-gold",
    text: "text-neon-gold",
    shadow: "hover:shadow-neon-gold focus:shadow-neon-gold",
    hoverBg: "hover:bg-neon-gold/10",
  },
  purple: {
    border: "border-neon-purple",
    text: "text-neon-purple",
    shadow: "hover:shadow-neon-purple focus:shadow-neon-purple",
    hoverBg: "hover:bg-neon-purple/10",
  },
};

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  color?: NeonColor;
  fullWidth?: boolean;
}

export default function NeonButton({
  color = "cyan",
  fullWidth,
  className,
  disabled,
  children,
  ...props
}: NeonButtonProps) {
  const c = colorMap[color];
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      className={cn(
        "relative px-6 py-3 rounded-md border-2 bg-arcade-panel/60 uppercase tracking-wider font-pixel text-xs transition-all duration-150",
        c.border,
        c.text,
        c.shadow,
        c.hoverBg,
        fullWidth && "w-full",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
