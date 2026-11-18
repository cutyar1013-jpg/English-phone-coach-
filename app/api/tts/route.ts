import { NextResponse } from "next/server";
import { UpstreamError, resolveOpenAIKey, synthesizeSpeech } from "@/lib/openai";
import { clamp } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

interface TtsBody {
  text?: string;
  voice?: string;
  speed?: number;
  model?: string;
}

/** "Play native model" — turns any phrase into native-sounding audio. */
export async function POST(req: Request) {
  try {
    const apiKey = resolveOpenAIKey(req);
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_openai_key",
          message: "Add your OpenAI API key in Settings to hear native audio.",
        },
        { status: 401, headers: NO_STORE }
      );
    }

    const body = (await req.json()) as TtsBody;
    const text = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "empty_text", message: "Nothing to speak." },
        { status: 400, headers: NO_STORE }
      );
    }

    const speech = await synthesizeSpeech({
      apiKey,
      text: text.slice(0, 1200),
      voice: body.voice?.trim() || "nova",
      speed: clamp(typeof body.speed === "number" ? body.speed : 1, 0.5, 2),
      model: body.model?.trim() || process.env.OPENAI_TTS_MODEL || "tts-1",
    });

    return NextResponse.json(
      { ok: true, audioBase64: speech.base64, audioMime: speech.mime },
      { headers: NO_STORE }
    );
  } catch (err) {
    const status = err instanceof UpstreamError ? err.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error: "tts_failed",
        message: err instanceof Error ? err.message : "Could not generate audio.",
      },
      { status, headers: NO_STORE }
    );
  }
}
