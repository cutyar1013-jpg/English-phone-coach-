export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export type Tone = "good" | "ok" | "weak" | "none";

/** Azure/OpenAI convention requested in the brief: >=85 green, 65-84 amber, <65 red. */
export function toneForScore(score?: number | null): Tone {
  if (score === undefined || score === null || Number.isNaN(score)) return "none";
  if (score >= 85) return "good";
  if (score >= 65) return "ok";
  return "weak";
}

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-mint",
  ok: "text-amber",
  weak: "text-coral",
  none: "text-white/50",
};

export const TONE_BG: Record<Tone, string> = {
  good: "bg-mint/15 border-mint/30",
  ok: "bg-amber/15 border-amber/30",
  weak: "bg-coral/15 border-coral/30",
  none: "bg-white/5 border-white/10",
};

export const TONE_HEX: Record<Tone, string> = {
  good: "#34d399",
  ok: "#fbbf24",
  weak: "#fb7185",
  none: "#64748b",
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
