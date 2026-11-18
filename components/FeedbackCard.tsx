"use client";

import { useState } from "react";
import { TONE_BG, TONE_HEX, TONE_TEXT, toneForScore } from "@/lib/format";
import type { PronunciationAssessment, Turn } from "@/lib/types";
import {
  ChevronDownIcon,
  PlayIcon,
  SparkIcon,
  SpinnerIcon,
  TargetIcon,
  VolumeIcon,
} from "./Icons";

interface Props {
  turn: Turn;
  defaultOpen?: boolean;
  onPlayPhrase: (text: string) => void;
  onRecheck?: () => void;
  recheckBusy?: boolean;
  azureAvailable: boolean;
}

function ScoreTile({ label, score }: { label: string; score: number }) {
  const tone = toneForScore(score);
  return (
    <div className={`rounded-xl border px-2 py-1.5 ${TONE_BG[tone]}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className={`mt-0.5 text-[17px] font-semibold leading-none tabular-nums ${TONE_TEXT[tone]}`}>
        {Math.round(score)}
      </p>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(3, Math.min(100, score))}%`, background: TONE_HEX[tone] }}
        />
      </div>
    </div>
  );
}

function scoreToneStyle(score: number) {
  const tone = toneForScore(score);
  const map: Record<string, { color: string; background: string; border: string }> = {
    good: { color: "#6ee7b7", background: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)" },
    ok: { color: "#fcd34d", background: "rgba(251,191,36,0.13)", border: "rgba(251,191,36,0.28)" },
    weak: { color: "#fda4af", background: "rgba(251,113,133,0.14)", border: "rgba(251,113,133,0.3)" },
    none: { color: "#94a3b8", background: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)" },
  };
  return map[tone];
}

function WordRow({ assessment }: { assessment: PronunciationAssessment }) {
  const [selected, setSelected] = useState<number | null>(null);
  const words = assessment.words.filter((w) => w.word.trim().length > 0);
  if (words.length === 0) return null;

  return (
    <div>
      <p className="label mb-2">Word by word</p>
      <div className="flex flex-wrap gap-1.5">
        {words.map((w, i) => {
          const style = scoreToneStyle(w.score);
          const isActive = selected === i;
          return (
            <button
              key={`${w.word}-${i}`}
              type="button"
              onClick={() => setSelected(isActive ? null : i)}
              className="rounded-md border px-1.5 py-0.5 text-[13px] leading-5 transition active:scale-95"
              style={{
                color: style.color,
                background: style.background,
                borderColor: isActive ? style.color : style.border,
              }}
            >
              {w.word}
              <span className="ml-1 text-[9px] opacity-60">{Math.round(w.score)}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && words[selected]?.phonemes.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-ink-950/50 px-2.5 py-2">
          <span className="mr-1 text-xs text-white/45">{words[selected].word}</span>
          {words[selected].phonemes.map((p, idx) => {
            const style = scoreToneStyle(p.score);
            return (
              <span
                key={`${p.phoneme}-${idx}`}
                className="rounded px-1 py-0.5 font-mono text-[12px]"
                style={{ color: style.color, background: style.background }}
                title={`${Math.round(p.score)} / 100`}
              >
                /{p.phoneme}/
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function FeedbackCard({
  turn,
  defaultOpen = false,
  onPlayPhrase,
  onRecheck,
  recheckBusy,
  azureAvailable,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const fb = turn.feedback;
  const assessment = turn.assessment ?? null;
  const hasContent =
    !!assessment ||
    !!fb?.natural.length ||
    !!fb?.pronunciation.length ||
    !!fb?.intonation.length ||
    !!fb?.vocabulary.length;

  if (!fb && !assessment) return null;

  const summary = assessment
    ? `${Math.round(assessment.pronunciation || assessment.accuracy)} pron.`
    : fb?.natural.length
      ? `${fb.natural.length} upgrade${fb.natural.length > 1 ? "s" : ""}`
      : "clean turn";

  const modelPhrase =
    fb?.natural[0]?.better || fb?.pronunciation[0]?.drill || turn.text;

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/[0.09] bg-ink-850/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <SparkIcon className="h-3.5 w-3.5 text-aqua/80" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Coach notes
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/35">
          {summary}
          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-white/[0.06] px-3.5 pb-3.5 pt-3">
          {fb?.headline ? <p className="text-[13px] text-white/60">{fb.headline}</p> : null}

          {assessment ? (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                <ScoreTile label="Accuracy" score={assessment.accuracy} />
                <ScoreTile label="Fluency" score={assessment.fluency} />
                <ScoreTile label="Complete" score={assessment.completeness} />
                {assessment.prosody > 0 ? (
                  <ScoreTile label="Prosody" score={assessment.prosody} />
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
                      Prosody
                    </p>
                    <p className="mt-0.5 text-[17px] leading-none text-white/25">–</p>
                  </div>
                )}
              </div>
              <WordRow assessment={assessment} />
            </>
          ) : null}

          {fb?.natural.length ? (
            <div>
              <p className="label mb-2">Say it more naturally</p>
              <div className="space-y-2">
                {fb.natural.map((n, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5">
                    <p className="text-[13px] leading-snug text-white/40 line-through decoration-coral/50">
                      {n.original}
                    </p>
                    <div className="mt-1 flex items-start gap-1.5">
                      <p className="flex-1 text-[15px] leading-snug text-aqua">“{n.better}”</p>
                      <button
                        type="button"
                        onClick={() => onPlayPhrase(n.better)}
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-aqua/25 bg-aqua/10 text-aqua active:scale-95"
                        aria-label="Play native model"
                      >
                        <PlayIcon className="h-3 w-3" />
                      </button>
                    </div>
                    {n.note ? <p className="mt-1 text-[11px] leading-relaxed text-white/40">{n.note}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {fb?.pronunciation.length ? (
            <div>
              <p className="label mb-2 flex items-center gap-1.5">
                <TargetIcon className="h-3 w-3" /> Pronunciation &amp; stress
              </p>
              <div className="space-y-2">
                {fb.pronunciation.map((p, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[14px] font-semibold text-white/90">{p.focus}</span>
                      {p.ipa ? (
                        <span className="rounded bg-violet/15 px-1.5 py-0.5 font-mono text-[12px] text-violet">
                          /{p.ipa.replace(/^\/|\/$/g, "")}/
                        </span>
                      ) : null}
                    </div>
                    {p.issue ? (
                      <p className="mt-1 text-[12px] leading-relaxed text-white/55">{p.issue}</p>
                    ) : null}
                    {p.drill ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <p className="flex-1 text-[12px] italic leading-relaxed text-amber/85">{p.drill}</p>
                        <button
                          type="button"
                          onClick={() => onPlayPhrase(p.drill!)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 active:scale-95"
                          aria-label="Hear drill"
                        >
                          <PlayIcon className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {fb?.intonation.length ? (
            <div>
              <p className="label mb-2">Intonation</p>
              <ul className="space-y-1.5">
                {fb.intonation.map((line, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-white/60">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-sky" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {fb?.vocabulary.length ? (
            <div>
              <p className="label mb-2">Worth stealing</p>
              <div className="space-y-1.5">
                {fb.vocabulary.map((v, i) => (
                  <div key={i} className="text-[12px] leading-relaxed">
                    <span className="font-semibold text-sky">{v.term}</span>
                    {v.meaning ? <span className="text-white/55"> — {v.meaning}</span> : null}
                    {v.example ? <p className="mt-0.5 italic text-white/35">“{v.example}”</p> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!hasContent ? (
            <p className="text-[12px] text-white/40">
              Nothing worth interrupting for — that turn was clean.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onPlayPhrase(modelPhrase)}
              className="btn-mini gap-1.5 border-aqua/25 bg-aqua/10 text-aqua"
            >
              <VolumeIcon className="h-3.5 w-3.5" />
              Play native model
            </button>

            {azureAvailable && onRecheck ? (
              <button
                type="button"
                onClick={onRecheck}
                disabled={recheckBusy}
                className="btn-mini gap-1.5"
              >
                {recheckBusy ? (
                  <SpinnerIcon className="h-3 w-3" />
                ) : (
                  <TargetIcon className="h-3.5 w-3.5" />
                )}
                {turn.assessment ? "Re-score" : "Score pronunciation"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
