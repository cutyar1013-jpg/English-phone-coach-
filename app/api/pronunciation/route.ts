import { NextResponse } from "next/server";
import { assessPronunciation } from "@/lib/azure";
import { UpstreamError, resolveAzure } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * Optional Azure Speech Pronunciation Assessment.
 *
 * POST multipart/form-data
 *   audio: 16 kHz mono PCM WAV (the client converts MediaRecorder output)
 *   text:  the reference transcript to score against
 * Headers: x-azure-key / x-azure-region (or server-side AZURE_SPEECH_KEY / _REGION)
 */
export async function POST(req: Request) {
  try {
    const { key, region } = resolveAzure(req);
    if (!key || !region) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_azure_config",
          message: "Add an Azure Speech key and region in Settings to enable pronunciation scoring.",
        },
        { status: 400, headers: NO_STORE }
      );
    }

    const form = await req.formData();
    const audio = form.get("audio");
    const text = String(form.get("text") ?? "").slice(0, 2000);

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { ok: false, error: "missing_audio", message: "No WAV audio was attached." },
        { status: 400, headers: NO_STORE }
      );
    }
    if (!(audio.type || "").includes("wav")) {
      return NextResponse.json(
        {
          ok: false,
          error: "unsupported_format",
          message: "Azure needs 16 kHz mono WAV. Leave Azure off, or record again with it enabled.",
        },
        { status: 415, headers: NO_STORE }
      );
    }

    const wav = Buffer.from(await audio.arrayBuffer());
    const assessment = await assessPronunciation({ key, region, wav, referenceText: text });

    return NextResponse.json({ ok: true, assessment }, { headers: NO_STORE });
  } catch (err) {
    const status = err instanceof UpstreamError ? err.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error: "pronunciation_failed",
        message: err instanceof Error ? err.message : "Pronunciation assessment failed.",
      },
      { status, headers: NO_STORE }
    );
  }
}
