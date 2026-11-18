"use client";

import type { CallStatus } from "./types";
import { WaveLogo } from "./Icons";

interface Props {
  status: CallStatus;
  size?: number;
  live?: boolean;
}

/**
 * The coach's "face": a gradient orb that breathes while idle, pulses while
 * listening, orbits while thinking and ripples while speaking.
 */
export default function CoachAvatar({ status, size = 64, live = true }: Props) {
  const active = live && status === "recording";
  const speaking = live && status === "speaking";
  const thinking = live && status === "processing";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {active ? (
        <>
          <span className="absolute inset-0 rounded-full border border-coral/40 animate-ring" />
          <span
            className="absolute inset-0 rounded-full border border-coral/30 animate-ring"
            style={{ animationDelay: "0.8s" }}
          />
        </>
      ) : null}
      {speaking ? (
        <>
          <span className="absolute inset-0 rounded-full border border-aqua/40 animate-ring" />
          <span
            className="absolute inset-0 rounded-full border border-aqua/30 animate-ring"
            style={{ animationDelay: "0.7s" }}
          />
          <span
            className="absolute inset-0 rounded-full border border-violet/25 animate-ring"
            style={{ animationDelay: "1.4s" }}
          />
        </>
      ) : null}
      {thinking ? (
        <span className="absolute -inset-1 rounded-full border border-violet/40 border-t-transparent animate-spin" />
      ) : null}

      <div
        className={`relative flex h-full w-full items-center justify-center rounded-full p-[1.5px] ${
          active
            ? "bg-gradient-to-br from-coral via-amber to-coral shadow-[0_0_30px_-6px_rgba(251,113,133,0.6)]"
            : "bg-gradient-to-br from-aqua via-sky to-violet shadow-glow"
        } ${!active && !speaking && !thinking ? "animate-breathe" : ""}`}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-ink-900/95">
          <WaveLogo className="h-[52%] w-[52%]" />
        </div>
      </div>
    </div>
  );
}
