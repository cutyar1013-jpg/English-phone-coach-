"use client";

import { useMemo } from "react";
import { countWords, formatClock, formatDuration } from "@/lib/format";
import type { Turn } from "@/lib/types";
import Sheet from "./Sheet";
import { SparkIcon, TargetIcon, TrashIcon } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  turns: Turn[];
  callSeconds: number;
  onClear: () => void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-white/85">{value}</p>
    </div>
  );
}

export default function ReviewSheet({ open, onClose, turns, callSeconds, onClear }: Props) {
  const stats = useMemo(() => {
    const userTurns = turns.filter((t) => t.role === "user");
    const words = userTurns.reduce((sum, t) => sum + countWords(t.text), 0);
    const speaking = userTurns.reduce((sum, t) => sum + (t.durationSec ?? 0), 0);
    const scored = userTurns.filter((t) => t.assessment);
    const avg = (key: "accuracy" | "fluency" | "prosody") =>
      scored.length
        ? Math.round(scored.reduce((sum, t) => sum + (t.assessment?.[key] ?? 0), 0) / scored.length)
        : 0;
    const upgrades = userTurns.flatMap((t) => t.feedback?.natural ?? []);
    const focus = Array.from(
      new Set(userTurns.flatMap((t) => (t.feedback?.pronunciation ?? []).map((p) => p.focus)))
    );
    return {
      turns: userTurns.length,
      words,
      speaking,
      scored: scored.length,
      accuracy: avg("accuracy"),
      fluency: avg("fluency"),
      prosody: avg("prosody"),
      upgrades,
      focus,
    };
  }, [turns]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Session review"
      subtitle="Everything the coach picked up on this call."
      footer={
        <button
          type="button"
          onClick={() => {
            onClear();
            onClose();
          }}
          className="btn-ghost w-full gap-2 border-coral/25 bg-coral/[0.06] py-3 text-coral/90"
        >
          <TrashIcon className="h-4 w-4" />
          Start a fresh session
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Call time" value={formatClock(callSeconds)} />
        <Stat label="Your turns" value={String(stats.turns)} />
        <Stat label="Words spoken" value={String(stats.words)} />
        <Stat label="Speaking time" value={formatDuration(stats.speaking) || "0s"} />
      </div>

      {stats.scored > 0 ? (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Accuracy" value={`${stats.accuracy}`} />
          <Stat label="Fluency" value={`${stats.fluency}`} />
          <Stat label="Prosody" value={stats.prosody ? `${stats.prosody}` : "–"} />
        </div>
      ) : null}

      <div className="mt-5">
        <p className="label mb-2 flex items-center gap-1.5">
          <SparkIcon className="h-3 w-3" /> Phrasing upgrades
        </p>
        {stats.upgrades.length === 0 ? (
          <p className="text-[12px] text-white/35">No upgrades yet — have a few more turns.</p>
        ) : (
          <div className="space-y-1.5">
            {stats.upgrades.slice(0, 12).map((u, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2">
                <p className="text-[11.5px] text-white/35 line-through decoration-coral/40">{u.original}</p>
                <p className="text-[13px] text-aqua">“{u.better}”</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="label mb-2 flex items-center gap-1.5">
          <TargetIcon className="h-3 w-3" /> Sounds to drill
        </p>
        {stats.focus.length === 0 ? (
          <p className="text-[12px] text-white/35">Nothing flagged yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {stats.focus.slice(0, 20).map((f, i) => (
              <span key={`${f}-${i}`} className="chip border-violet/20 bg-violet/10 text-violet/90">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
