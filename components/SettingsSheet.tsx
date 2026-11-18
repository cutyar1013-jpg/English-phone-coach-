"use client";

import { useEffect, useState } from "react";
import { AZURE_REGIONS, TEXT_MODELS, TRANSCRIBE_MODELS, TTS_MODELS, VOICES } from "@/lib/scenarios";
import type { AppSettings } from "@/lib/settings";
import type { HealthResponse } from "@/lib/types";
import Sheet from "./Sheet";
import { CheckIcon, KeyIcon, SpinnerIcon, TrashIcon, VolumeIcon } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (next: AppSettings) => void;
  onReset: () => void;
  health: HealthResponse | null;
  onPreviewVoice: (draft: AppSettings) => Promise<void>;
  onClearSession: () => void;
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[14px] text-white/85">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] leading-relaxed text-white/40">{hint}</span> : null}
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${
          checked ? "bg-aqua" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function SectionTitle({ children, badge }: { children: React.ReactNode; badge?: string }) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-2 first:mt-0">
      <p className="label">{children}</p>
      {badge ? (
        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/35">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export default function SettingsSheet({
  open,
  onClose,
  settings,
  onSave,
  onReset,
  health,
  onPreviewVoice,
  onClearSession,
}: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [showAzureKey, setShowAzureKey] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const preview = async () => {
    setPreviewing(true);
    try {
      await onPreviewVoice(draft);
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Settings"
      subtitle="Your keys stay on this device and travel only to this app's own API, over HTTPS."
      footer={
        <div className="flex items-center gap-2">
          <button type="button" onClick={onReset} className="btn-ghost px-3 text-xs text-white/50">
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="btn-primary flex-1 py-3"
          >
            <CheckIcon className="h-4 w-4" />
            Save settings
          </button>
        </div>
      }
    >
      <SectionTitle>OpenAI</SectionTitle>

      <label className="block">
        <span className="mb-1.5 block text-[12px] text-white/55">API key</span>
        <div className="relative">
          <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            type={showKey ? "text" : "password"}
            value={draft.openaiKey}
            onChange={(e) => update("openaiKey", e.target.value)}
            placeholder={health?.openaiServerKey ? "Using server key" : "sk-..."}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="input pl-9 pr-14 font-mono text-[13px]"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] text-white/45"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
          {health?.openaiServerKey
            ? "A server key is configured — you can leave this blank. A key entered here overrides it for your session."
            : "No server key found. Paste your key here, or set OPENAI_API_KEY in .env.local / Vercel."}
        </p>
      </label>

      <div className="mt-3 grid grid-cols-1 gap-2.5">
        <label className="block">
          <span className="mb-1.5 block text-[12px] text-white/55">Coaching model</span>
          <select
            className="select"
            value={draft.textModel}
            onChange={(e) => update("textModel", e.target.value)}
          >
            {TEXT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] text-white/55">Transcription</span>
          <select
            className="select"
            value={draft.transcribeModel}
            onChange={(e) => update("transcribeModel", e.target.value)}
          >
            {TRANSCRIBE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12px] text-white/55">Voice model</span>
          <select
            className="select"
            value={draft.ttsModel}
            onChange={(e) => update("ttsModel", e.target.value)}
          >
            {TTS_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SectionTitle>Coach voice</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {VOICES.map((v) => {
          const active = draft.voice === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => update("voice", v.id)}
              className={`rounded-xl border px-2.5 py-2 text-left transition ${
                active
                  ? "border-aqua/50 bg-aqua/10"
                  : "border-white/[0.08] bg-white/[0.03] active:scale-[0.99]"
              }`}
            >
              <span className={`block text-[13px] font-medium ${active ? "text-aqua" : "text-white/80"}`}>
                {v.label}
              </span>
              <span className="mt-0.5 block text-[10px] text-white/35">{v.note}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={preview}
        disabled={previewing}
        className="btn-mini mt-2 w-full gap-1.5 py-2"
      >
        {previewing ? <SpinnerIcon className="h-3.5 w-3.5" /> : <VolumeIcon className="h-3.5 w-3.5" />}
        Preview “{VOICES.find((v) => v.id === draft.voice)?.label ?? "voice"}” with this speed
      </button>

      <div className="mt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[12px] text-white/55">Speaking speed</span>
          <span className="font-mono text-[12px] text-aqua">{draft.speed.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min={0.6}
          max={1.4}
          step={0.05}
          value={draft.speed}
          onChange={(e) => update("speed", Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-aqua"
        />
        <div className="mt-1 flex justify-between text-[10px] text-white/30">
          <span>0.60 slower</span>
          <span>1.00 native</span>
          <span>1.40 faster</span>
        </div>
      </div>

      <div className="mt-3">
        <Toggle
          checked={draft.autoPlay}
          onChange={(v) => update("autoPlay", v)}
          label="Auto-play the coach's reply"
          hint="Turn off to read first and tap play yourself."
        />
      </div>

      <SectionTitle badge="optional">Azure pronunciation</SectionTitle>
      <Toggle
        checked={draft.azureEnabled}
        onChange={(v) => update("azureEnabled", v)}
        label="Score every turn"
        hint="Adds word- and phoneme-level accuracy, fluency and prosody scores. Audio is converted to 16 kHz WAV on your device first."
      />

      {draft.azureEnabled ? (
        <div className="mt-2.5 space-y-2.5">
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-white/55">Speech key</span>
            <div className="relative">
              <input
                type={showAzureKey ? "text" : "password"}
                value={draft.azureKey}
                onChange={(e) => update("azureKey", e.target.value)}
                placeholder={health?.azureServerKey ? "Using server key" : "Azure Speech key"}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="input pr-14 font-mono text-[13px]"
              />
              <button
                type="button"
                onClick={() => setShowAzureKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] text-white/45"
              >
                {showAzureKey ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-white/55">Region</span>
            <select
              className="select"
              value={draft.azureRegion}
              onChange={(e) => update("azureRegion", e.target.value)}
            >
              {AZURE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] leading-relaxed text-white/35">
            {health?.azureServerKey
              ? `Server key detected${health.azureRegion ? ` (${health.azureRegion})` : ""}. Leave these blank to use it.`
              : "Find both under your Azure Speech resource → Keys and Endpoint."}
          </p>
        </div>
      ) : null}

      <SectionTitle>This session</SectionTitle>
      <button
        type="button"
        onClick={onClearSession}
        className="flex w-full items-center gap-2 rounded-xl border border-coral/20 bg-coral/[0.06] px-3.5 py-3 text-left text-[13px] text-coral/90"
      >
        <TrashIcon className="h-4 w-4" />
        Clear conversation history
      </button>

      <p className="mt-4 text-[10px] leading-relaxed text-white/25">
        Keys are stored in this browser only (localStorage) and sent per request in HTTPS headers —
        they are never written to the server, logs, or the repository. Anyone with access to this
        device can read them, so use a scoped key.
      </p>
    </Sheet>
  );
}
