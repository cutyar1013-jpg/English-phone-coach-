"use client";

import type { CallStatus } from "./types";
import { MicIcon, SpinnerIcon, StopIcon } from "./Icons";

interface Props {
  status: CallStatus;
  onClick: () => void;
  disabled?: boolean;
}

export default function MicButton({ status, onClick, disabled }: Props) {
  const recording = status === "recording";
  const processing = status === "processing";

  return (
    <div className="relative flex items-center justify-center">
      {recording ? (
        <>
          <span className="absolute h-[92px] w-[92px] rounded-full border border-coral/40 animate-ring" />
          <span
            className="absolute h-[92px] w-[92px] rounded-full border border-coral/30 animate-ring"
            style={{ animationDelay: "0.7s" }}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || processing}
        aria-label={recording ? "Stop recording and send" : "Start speaking"}
        className={`relative flex h-[84px] w-[84px] items-center justify-center rounded-full transition active:scale-[0.97] ${
          recording
            ? "bg-gradient-to-br from-coral via-rose-500 to-rose-600 shadow-[0_0_50px_-8px_rgba(251,113,133,0.85)]"
            : processing
              ? "bg-gradient-to-br from-ink-700 to-ink-800 shadow-card"
              : "bg-gradient-to-br from-aqua via-sky to-aqua shadow-glow"
        } disabled:opacity-90`}
      >
        <span
          className={`absolute inset-[6px] rounded-full ${
            recording ? "bg-ink-950/10" : "bg-transparent"
          }`}
        />
        {processing ? (
          <SpinnerIcon className="h-7 w-7 text-white/70" />
        ) : recording ? (
          <StopIcon className="h-8 w-8 text-white" />
        ) : (
          <MicIcon className="h-8 w-8 text-ink-950" />
        )}
      </button>
    </div>
  );
}
