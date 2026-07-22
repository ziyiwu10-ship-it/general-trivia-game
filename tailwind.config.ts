import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        arcade: {
          bg: "#0a0a12",
          panel: "#120e24",
          panel2: "#1a1330",
          border: "#2a2145",
        },
        neon: {
          cyan: "#2de2e6",
          pink: "#ff2bd6",
          green: "#39ff14",
          gold: "#ffd93e",
          purple: "#b967ff",
        },
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        terminal: ["var(--font-terminal)", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 5px #2de2e6, 0 0 15px #2de2e6, 0 0 30px rgba(45,226,230,0.4)",
        "neon-pink": "0 0 5px #ff2bd6, 0 0 15px #ff2bd6, 0 0 30px rgba(255,43,214,0.4)",
        "neon-green": "0 0 5px #39ff14, 0 0 15px #39ff14, 0 0 30px rgba(57,255,20,0.4)",
        "neon-gold": "0 0 5px #ffd93e, 0 0 15px #ffd93e, 0 0 30px rgba(255,217,62,0.4)",
        "neon-purple": "0 0 5px #b967ff, 0 0 15px #b967ff, 0 0 30px rgba(185,103,255,0.4)",
      },
      textShadow: {
        "neon-cyan": "0 0 5px #2de2e6, 0 0 15px #2de2e6",
        "neon-pink": "0 0 5px #ff2bd6, 0 0 15px #ff2bd6",
        "neon-green": "0 0 5px #39ff14, 0 0 15px #39ff14",
        "neon-gold": "0 0 5px #ffd93e, 0 0 15px #ffd93e",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "45%": { opacity: "1" },
          "46%": { opacity: "0.6" },
          "48%": { opacity: "1" },
          "50%": { opacity: "0.8" },
          "52%": { opacity: "1" },
        },
        "pulse-glow": {
          "0%": { filter: "brightness(1)" },
          "50%": { filter: "brightness(1.6)" },
          "100%": { filter: "brightness(1)" },
        },
        scanline: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100%" },
        },
      },
      animation: {
        flicker: "flicker 4s linear infinite",
        "pulse-glow": "pulse-glow 0.6s ease-in-out",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: any) {
      addUtilities({
        ".text-shadow-neon-cyan": { textShadow: "0 0 5px #2de2e6, 0 0 15px #2de2e6" },
        ".text-shadow-neon-pink": { textShadow: "0 0 5px #ff2bd6, 0 0 15px #ff2bd6" },
        ".text-shadow-neon-green": { textShadow: "0 0 5px #39ff14, 0 0 15px #39ff14" },
        ".text-shadow-neon-gold": { textShadow: "0 0 5px #ffd93e, 0 0 15px #ffd93e" },
        ".text-shadow-neon-purple": { textShadow: "0 0 5px #b967ff, 0 0 15px #b967ff" },
      });
    },
  ],
};
export default config;
