"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { CallStatus } from "./types";

interface Props {
  levelRef: RefObject<number>;
  status: CallStatus;
  bars?: number;
  className?: string;
}

/**
 * A voice meter that animates straight from refs on the animation frame —
 * no React re-render per frame, so recording stays smooth on an iPhone.
 */
export default function AudioVisualizer({ levelRef, status, bars = 36, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    let raf = 0;
    let t = 0;

    const render = () => {
      t += 0.016;
      const level = Math.max(0, Math.min(1, levelRef.current ?? 0));
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const edge = Math.sin(((i + 0.5) / nodes.length) * Math.PI);
        let h = 0.07;

        if (status === "recording") {
          const jitter = 0.55 + 0.45 * Math.sin(t * 7.3 + i * 0.9);
          h = 0.08 + level * 1.9 * edge * jitter + 0.03 * Math.sin(t * 3.1 + i);
        } else if (status === "speaking") {
          h = 0.1 + 0.66 * edge * (0.42 + 0.58 * Math.abs(Math.sin(t * 3.1 + i * 0.52)));
        } else if (status === "processing") {
          const pos = (t * 1.25) % 1.2 - 0.1;
          const d = i / nodes.length - pos;
          h = 0.07 + 0.55 * Math.exp(-(d * d) / 0.005);
        } else if (status === "ready") {
          h = 0.1 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.5 + i * 0.34));
        } else {
          h = 0.09 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 0.28));
        }

        node.style.transform = `scaleY(${Math.max(0.03, Math.min(1, h)).toFixed(3)})`;
        node.style.opacity = status === "idle" ? "0.3" : String(0.45 + 0.55 * Math.min(1, h));
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [status, levelRef]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`mx-auto flex h-11 max-w-[260px] items-center justify-center gap-[3px] ${className}`}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="h-full w-[3px] origin-center rounded-full"
          style={{
            transform: "scaleY(0.07)",
            background: `linear-gradient(to top, rgba(94,234,212,0.95), rgba(167,139,250,${
              0.5 + 0.5 * (i / bars)
            }))`,
          }}
        />
      ))}
    </div>
  );
}
