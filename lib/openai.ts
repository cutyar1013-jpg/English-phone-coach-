import type {
  CoachFeedback,
  PhraseUpgrade,
  PronunciationTip,
  VocabNote,
} from "./types";
import { EMPTY_FEEDBACK } from "./types";
import { REPAIR_INSTRUCTION } from "./prompts";

export class UpstreamError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

export function resolveOpenAIKey(req: Request): string {
  const header = req.headers.get("x-openai-key")?.trim();
  const env = process.env.OPENAI_API_KEY?.trim();
  return header || env || "";
}

export function resolveAzure(req: Request): { key: string; region: string } {
  const key = req.headers.get("x-azure-key")?.trim() || process.env.AZURE_SPEECH_KEY?.trim() || "";
  const region =
    req.headers.get("x-azure-region")?.trim() || process.env.AZURE_SPEECH_REGION?.trim() || "";
  return { key, region };
}

export function openaiBaseUrl(): string {
  return (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
}

/** Map a recorded MIME type to a filename extension Whisper/Azure accept. */
export function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("flac")) return "flac";
  return "webm";
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    /* not json */
  }
  return text.slice(0, 400) || `HTTP ${res.status}`;
}

export async function transcribeAudio(opts: {
  apiKey: string;
  bytes: Buffer;
  mime: string;
  model: string;
  hint?: string;
}): Promise<string> {
  const attempt = async (model: string): Promise<string> => {
    const form = new FormData();
    const filename = `speech.${extensionForMime(opts.mime)}`;
    form.append("file", new Blob([new Uint8Array(opts.bytes)], { type: opts.mime || "audio/webm" }), filename);
    form.append("model", model);
    form.append("language", "en");
    form.append("response_format", "json");
    if (opts.hint) form.append("prompt", opts.hint);

    const res = await fetch(`${openaiBaseUrl()}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const detail = await readError(res);
      throw new UpstreamError(detail, res.status);
    }
    const data = (await res.json()) as { text?: string };
    return (data.text ?? "").trim();
  };

  try {
    return await attempt(opts.model);
  } catch (err) {
    // A missing/unavailable transcription model should not kill the call:
    // whisper-1 is the most widely available fallback.
    if (opts.model !== "whisper-1") {
      try {
        return await attempt("whisper-1");
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

function stripFences(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first > 0 && last > first) text = text.slice(first, last + 1);
  return text;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => str(v)).filter(Boolean).slice(0, 4);
}

export function normalizeFeedback(raw: unknown): CoachFeedback {
  if (!raw || typeof raw !== "object") return { ...EMPTY_FEEDBACK };
  const obj = raw as Record<string, unknown>;

  const natural: PhraseUpgrade[] = Array.isArray(obj.natural)
    ? obj.natural
        .map((item) => {
          const it = (item ?? {}) as Record<string, unknown>;
          return {
            original: str(it.original),
            better: str(it.better),
            note: str(it.note),
          };
        })
        .filter((it) => it.better.length > 0)
        .slice(0, 3)
    : [];

  const pronunciation: PronunciationTip[] = Array.isArray(obj.pronunciation)
    ? obj.pronunciation
        .map((item) => {
          const it = (item ?? {}) as Record<string, unknown>;
          return {
            focus: str(it.focus),
            ipa: str(it.ipa),
            issue: str(it.issue),
            drill: str(it.drill),
          };
        })
        .filter((it) => it.focus.length > 0 || it.issue.length > 0)
        .slice(0, 3)
    : [];

  const vocabulary: VocabNote[] = Array.isArray(obj.vocabulary)
    ? obj.vocabulary
        .map((item) => {
          const it = (item ?? {}) as Record<string, unknown>;
          return {
            term: str(it.term),
            meaning: str(it.meaning),
            example: str(it.example),
          };
        })
        .filter((it) => it.term.length > 0)
        .slice(0, 2)
    : [];

  return {
    headline: str(obj.headline),
    natural,
    pronunciation,
    intonation: strArray(obj.intonation).slice(0, 2),
    vocabulary,
  };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatCompletion(opts: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  json: boolean;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${openaiBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readError(res);
    throw new UpstreamError(detail, res.status);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

export interface CoachingResult {
  reply: string;
  feedback: CoachFeedback;
  model: string;
}

export async function generateCoaching(opts: {
  apiKey: string;
  model: string;
  system: string;
  history: ChatMessage[];
  userContent: string;
}): Promise<CoachingResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: opts.system },
    ...opts.history,
    { role: "user", content: opts.userContent },
  ];

  const raw = await chatCompletion({
    apiKey: opts.apiKey,
    model: opts.model,
    messages,
    temperature: 0.7,
    json: true,
  });

  const parsed = tryParse(raw);
  if (parsed) {
    return {
      reply: str(parsed.reply) || raw,
      feedback: normalizeFeedback(parsed),
      model: opts.model,
    };
  }

  // One repair pass, then degrade gracefully rather than failing the call.
  try {
    const repaired = await chatCompletion({
      apiKey: opts.apiKey,
      model: opts.model,
      messages: [
        ...messages,
        { role: "assistant", content: raw.slice(0, 2000) },
        { role: "user", content: REPAIR_INSTRUCTION },
      ],
      temperature: 0.2,
      json: true,
    });
    const second = tryParse(repaired);
    if (second) {
      return {
        reply: str(second.reply) || repaired,
        feedback: normalizeFeedback(second),
        model: opts.model,
      };
    }
    return {
      reply: str(repaired) || raw,
      feedback: normalizeFeedback(second),
      model: opts.model,
    };
  } catch {
    return {
      reply: stripFences(raw),
      feedback: normalizeFeedback(null),
      model: opts.model,
    };
  }
}

function tryParse(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(stripFences(raw)) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export async function synthesizeSpeech(opts: {
  apiKey: string;
  text: string;
  voice: string;
  speed: number;
  model: string;
}): Promise<{ base64: string; mime: string; model: string }> {
  const speed = Math.min(2, Math.max(0.5, opts.speed || 1));
  const res = await fetch(`${openaiBaseUrl()}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      voice: opts.voice,
      input: opts.text.slice(0, 4000),
      speed,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    const detail = await readError(res);
    throw new UpstreamError(detail, res.status);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { base64: buffer.toString("base64"), mime: "audio/mpeg", model: opts.model };
}
