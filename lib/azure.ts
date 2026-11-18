import type { PhonemeScore, PronunciationAssessment, WordScore } from "./types";
import { UpstreamError } from "./openai";

interface AzurePhoneme {
  Phoneme?: string;
  PronunciationAssessment?: { AccuracyScore?: number };
}

interface AzureWord {
  Word?: string;
  PronunciationAssessment?: { AccuracyScore?: number; ErrorType?: string };
  Phonemes?: AzurePhoneme[];
}

interface AzureNBest {
  PronunciationAssessment?: {
    AccuracyScore?: number;
    FluencyScore?: number;
    CompletenessScore?: number;
    PronScore?: number;
    ProsodyScore?: number;
  };
  Words?: AzureWord[];
  Display?: string;
  Lexical?: string;
}

interface AzureResponse {
  RecognitionStatus?: string;
  DisplayText?: string;
  NBest?: AzureNBest[];
}

function round(n: number | undefined): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.round(n * 10) / 10;
}

function buildConfig(referenceText: string, prosody: boolean): string {
  const config: Record<string, unknown> = {
    ReferenceText: referenceText,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    EnableMiscue: false,
    PhonemeAlphabet: "IPA",
    NBestPhonemeCount: 0,
  };
  if (prosody) config.EnableProsodyAssessment = true;
  return Buffer.from(JSON.stringify(config), "utf-8").toString("base64");
}

async function request(
  key: string,
  region: string,
  wav: Buffer,
  referenceText: string,
  prosody: boolean
): Promise<AzureResponse> {
  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
      "Pronunciation-Assessment": buildConfig(referenceText, prosody),
      Accept: "application/json",
    },
    body: new Uint8Array(wav),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const status = res.status;
    if (status === 401 || status === 403) {
      throw new UpstreamError(
        "Azure rejected the key or region (401/403). Check AZURE_SPEECH_KEY / AZURE_SPEECH_REGION.",
        status
      );
    }
    throw new UpstreamError(text.slice(0, 300) || `Azure HTTP ${status}`, status);
  }
  return (await res.json()) as AzureResponse;
}

/**
 * Azure Speech Pronunciation Assessment (en-US, Phoneme granularity).
 * Expects 16 kHz / 16-bit / mono PCM WAV — the client converts before upload.
 */
export async function assessPronunciation(opts: {
  key: string;
  region: string;
  wav: Buffer;
  referenceText: string;
}): Promise<PronunciationAssessment> {
  const { key, region } = opts;
  if (!key || !region) {
    throw new UpstreamError("Azure Speech key/region not configured.", 400);
  }
  if (opts.wav.byteLength < 44 + 16000 * 0.15) {
    throw new UpstreamError("Recording too short for pronunciation scoring.", 400);
  }

  let data: AzureResponse;
  try {
    data = await request(key, region, opts.wav, opts.referenceText, true);
  } catch (err) {
    // Older regions reject EnableProsodyAssessment — retry without it.
    if (err instanceof UpstreamError && err.status === 400) {
      data = await request(key, region, opts.wav, opts.referenceText, false);
    } else {
      throw err;
    }
  }

  if (data.RecognitionStatus && data.RecognitionStatus !== "Success") {
    throw new UpstreamError(
      data.RecognitionStatus === "InitialSilenceTimeout" || data.RecognitionStatus === "NoMatch"
        ? "Azure could not hear speech in that clip."
        : `Azure recognition failed: ${data.RecognitionStatus}`,
      422
    );
  }

  const best = data.NBest?.[0];
  if (!best?.PronunciationAssessment) {
    throw new UpstreamError("Azure returned no pronunciation scores.", 502);
  }

  const pa = best.PronunciationAssessment;
  const words: WordScore[] = (best.Words ?? []).map((w) => {
    const phonemes: PhonemeScore[] = (w.Phonemes ?? []).map((p) => ({
      phoneme: p.Phoneme ?? "",
      score: round(p.PronunciationAssessment?.AccuracyScore),
    }));
    return {
      word: w.Word ?? "",
      score: round(w.PronunciationAssessment?.AccuracyScore),
      errorType: w.PronunciationAssessment?.ErrorType,
      phonemes,
    };
  });

  return {
    accuracy: round(pa.AccuracyScore),
    fluency: round(pa.FluencyScore),
    completeness: round(pa.CompletenessScore),
    prosody: round(pa.ProsodyScore),
    pronunciation: round(pa.PronScore ?? pa.AccuracyScore),
    words,
    recognizedText: data.DisplayText || best.Display || best.Lexical,
  };
}
