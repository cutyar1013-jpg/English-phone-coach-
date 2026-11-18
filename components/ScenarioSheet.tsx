"use client";

import { useEffect, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import type { ScenarioId } from "@/lib/types";
import Sheet from "./Sheet";
import { CheckIcon } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  scenarioId: ScenarioId;
  topic: string;
  onSelect: (id: ScenarioId, topic: string) => void;
}

export default function ScenarioSheet({ open, onClose, scenarioId, topic, onSelect }: Props) {
  const [draftId, setDraftId] = useState<ScenarioId>(scenarioId);
  const [draftTopic, setDraftTopic] = useState(topic);

  useEffect(() => {
    if (open) {
      setDraftId(scenarioId);
      setDraftTopic(topic);
    }
  }, [open, scenarioId, topic]);

  const active = SCENARIOS.find((s) => s.id === draftId) ?? SCENARIOS[0];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="What are we practising?"
      subtitle="Switch any time — the coach adapts mid-call."
      footer={
        <button
          type="button"
          onClick={() => {
            onSelect(draftId, draftTopic.trim());
            onClose();
          }}
          className="btn-primary w-full py-3"
        >
          <CheckIcon className="h-4 w-4" />
          Use {active.short}
        </button>
      }
    >
      <div className="space-y-2">
        {SCENARIOS.map((s) => {
          const selected = s.id === draftId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setDraftId(s.id)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-aqua/45 bg-aqua/[0.07]"
                  : "border-white/[0.08] bg-white/[0.025] active:scale-[0.995]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${s.accent} ${
                  selected ? "ring-1 ring-aqua/40" : "ring-1 ring-white/5"
                }`}
              >
                {s.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className={`text-[14px] font-semibold ${selected ? "text-aqua" : "text-white/85"}`}>
                    {s.label}
                  </span>
                  {selected ? <CheckIcon className="h-3.5 w-3.5 text-aqua" /> : null}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-white/40">{s.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      {draftId === "custom" ? (
        <div className="mt-3">
          <label className="mb-1.5 block text-[12px] text-white/55">Your scenario or topic</label>
          <textarea
            value={draftTopic}
            onChange={(e) => setDraftTopic(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="e.g. A parent-teacher conference about a student who stopped doing homework. You play the parent."
            className="input resize-none leading-relaxed"
          />
          <p className="mt-1 text-[10px] text-white/30">{draftTopic.length}/300</p>
        </div>
      ) : null}
    </Sheet>
  );
}
