import { NextResponse } from "next/server";
import { assessPronunciation } from "@/lib/azure";
import {
  UpstreamError,
  extensionForMime,
  generateCoaching,
  resolveAzure,
  resolveOpenAIKey,
  synthesizeSpeech,
  transcribeAudio,
} from "@/lib/openai";
import { buildSystemPrompt, buildUserTurnContent, transcriptHint } from "@/lib/prompts";
import { getScenario } from "@/lib/scenarios";
import { EMPTY_FEEDBACK } from "@/lib/types";
import type {
  CoachFeedback,
  CoachPayload,
  CoachResponse,
  PronunciationAssessment,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function fail(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status, headers: NO_STORE });
}

function sanitizeHistory(input: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        !!m &&
        typeof m === "object" &&
        (m as { role?: unknown }).role !== undefined &&
        ((m as { role: string }).role === "user" || (m as { role: string }).role === "assistant") &&
        typeof (m as { content?: unknown }).content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-12);
}

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const apiKey = resolveOpenAIKey(req);
    if (!apiKey) {
      return fail(
        401,
        "missing_openai_key",
        "No OpenAI API key yet. Add one in Settings (or set OPENAI_API_KEY on the server)."
      );
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return fail(400, "missing_audio", "No audio was attached to the request.");
    }
    if (audio.size < 1200) {
      return fail(400, "too_short", "That clip was too short — hold the button a little longer.");
    }

    let payload: Partial<CoachPayload> = {};
    try {
      payload = JSON.parse(String(form.get("payload") ?? "{}")) as Partial<CoachPayload>;
    } catch {
      payload = {};
    }

    const scenario = getScenario(payload.scenarioId ?? "free-talk");
    const topic = (payload.topic ?? "").slice(0, 300);
    const history = sanitizeHistory(payload.history);
    const textModel = payload.models?.text?.trim() || process.env.OPENAI_TEXT_MODEL || "gpt-4o";
    const transcribeModel =
      payload.models?.transcribe?.trim() || process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
    const ttsModel = payload.models?.tts?.trim() || process.env.OPENAI_TTS_MODEL || "tts-1";
    const voice = payload.voice?.trim() || "nova";
    const speed = typeof payload.speed === "number" ? payload.speed : 1;
    const durationSec = typeof payload.durationSec === "number" ? payload.durationSec : 0;

    const bytes = Buffer.from(await audio.arrayBuffer());
    const mime = audio.type || "audio/webm";
    const warnings: string[] = [];

    // 1) Transcribe (Whisper / gpt-4o-transcribe)
    const transcript = await transcribeAudio({
      apiKey,
      bytes,
      mime,
      model: transcribeModel,
      hint: transcriptHint(scenario.id),
    });

    if (!transcript) {
      const empty: CoachResponse = {
        ok: true,
        transcript: "",
        reply: "",
        feedback: EMPTY_FEEDBACK,
        assessment: null,
        audioBase64: null,
        audioMime: "audio/mpeg",
        warnings: ["Nothing was heard in that clip."],
        emptySpeech: true,
      };
      return NextResponse.json(empty, { headers: NO_STORE });
    }

    // 2) Coach reply + feedback, and (optionally) Azure pronunciation scoring in parallel
    const azure = resolveAzure(req);
    const azureWanted = payload.azure?.enabled !== false && !!azure.key && !!azure.region;
    const isWav = mime.includes("wav");

    const coachingPromise = generateCoaching({
      apiKey,
      model: textModel,
      system: buildSystemPrompt(scenario, topic),
      history,
      userContent: buildUserTurnContent(transcript, scenario.id),
    });

    const azurePromise: Promise<PronunciationAssessment | null> = (async () => {
      if (!azureWanted) return null;
      if (!isWav) {
        warnings.push("Pronunciation scoring skipped: the clip was not WAV.");
        return null;
      }
      try {
        return await assessPronunciation({
          key: azure.key,
          region: azure.region,
          wav: bytes,
          referenceText: transcript,
        });
      } catch (err) {
        warnings.push(
          `Azure pronunciation: ${err instanceof Error ? err.message : "assessment failed"}`
        );
        return null;
      }
    })();

    const [coaching, assessment] = await Promise.all([coachingPromise, azurePromise]);

    // 3) Native voice for the reply (non-fatal if it fails)
    let audioBase64: string | null = null;
    let audioMime = "audio/mpeg";
    try {
      const speech = await synthesizeSpeech({
        apiKey,
        text: coaching.reply,
        voice,
        speed,
        model: ttsModel,
      });
      audioBase64 = speech.base64;
      audioMime = speech.mime;
    } catch (err) {
      warnings.push(`Voice: ${err instanceof Error ? err.message : "TTS failed"}`);
    }

    const feedback: CoachFeedback = coaching.feedback ?? EMPTY_FEEDBACK;

    const body: CoachResponse = {
      ok: true,
      transcript,
      reply: coaching.reply,
      feedback,
      assessment,
      audioBase64,
      audioMime,
      warnings,
    };

    return NextResponse.json(body, {
      headers: {
        ...NO_STORE,
        "X-Timing-Ms": String(Date.now() - started),
        "X-Models": `${textModel}|${transcribeModel}|${ttsModel}`,
      },
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      const status = err.status === 401 || err.status === 403 ? 401 : err.status;
      return fail(
        status,
        status === 401 ? "invalid_openai_key" : "upstream_error",
        err.message || "The upstream model returned an error."
      );
    }
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return fail(500, "server_error", message);
  }
}
