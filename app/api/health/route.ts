import { NextResponse } from "next/server";
import type { HealthResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tells the client whether server-side keys exist, so Settings can say "server key detected". */
export async function GET() {
  const body: HealthResponse = {
    ok: true,
    openaiServerKey: !!process.env.OPENAI_API_KEY?.trim(),
    azureServerKey: !!process.env.AZURE_SPEECH_KEY?.trim() && !!process.env.AZURE_SPEECH_REGION?.trim(),
    azureRegion: process.env.AZURE_SPEECH_REGION?.trim() ?? "",
    defaults: {
      text: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4o",
      transcribe: process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "whisper-1",
      tts: process.env.OPENAI_TTS_MODEL?.trim() || "tts-1",
    },
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
