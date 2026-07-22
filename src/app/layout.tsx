import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import SoundToggle from "@/components/SoundToggle";
import "./globals.css";

const pixelFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

const terminalFont = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-terminal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trivia Battle Royale",
  description: "Real-time multiplayer trivia for you and your friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pixelFont.variable} ${terminalFont.variable} scanlines antialiased text-lg`}
      >
        <div className="fixed inset-0 bg-arcade-bg bg-arcade-grid -z-10" />
        <SoundToggle />
        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
