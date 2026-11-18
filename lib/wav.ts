/** 16-bit PCM WAV encoding + resampling, all in the browser (no ffmpeg needed). */

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

/** Mixdown to mono, low-pass + resample to 16 kHz. */
function resampleToMono16k(buffer: AudioBuffer, targetRate = 16000): Float32Array {
  const channels = buffer.numberOfChannels;
  const srcLength = buffer.length;
  const srcRate = buffer.sampleRate;
  const ratio = srcRate / targetRate;
  const outLength = Math.max(1, Math.floor(srcLength / ratio));
  const out = new Float32Array(outLength);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c += 1) channelData.push(buffer.getChannelData(c));

  const window = Math.max(1, Math.floor(ratio));
  for (let i = 0; i < outLength; i += 1) {
    const srcIndex = i * ratio;
    let sum = 0;
    let count = 0;
    // Box filter over the source window acts as a crude anti-alias low-pass.
    const start = Math.floor(srcIndex - window / 2);
    const end = start + window;
    for (let j = start; j < end; j += 1) {
      const idx = Math.min(srcLength - 1, Math.max(0, j));
      let sample = 0;
      for (let c = 0; c < channels; c += 1) sample += channelData[c][idx];
      sum += sample / channels;
      count += 1;
    }
    out[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

type AudioCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Decode whatever MediaRecorder produced (webm/opus on Chrome & Android,
 * mp4/aac on iOS Safari) and re-encode as 16 kHz mono 16-bit WAV, which is
 * what Azure Pronunciation Assessment's REST endpoint accepts.
 */
export async function blobToWav16kMono(blob: Blob): Promise<Blob> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new Error("Web Audio API is not available in this browser.");
  const ctx = new Ctor();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      // Safari requires the callback form; other browsers accept both.
      const maybePromise = ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve).catch(reject);
      }
    });
    const samples = resampleToMono16k(decoded, 16000);
    return encodeWav(samples, 16000);
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

/** Short silent WAV used to unlock <audio> playback on iOS with a user gesture. */
export function silentWavObjectUrl(): string {
  return URL.createObjectURL(encodeWav(new Float32Array(800), 16000)); // 50 ms @ 16 kHz
}
