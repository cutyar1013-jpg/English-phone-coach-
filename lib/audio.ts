/** Recording helpers that stay honest about iOS Safari's MediaRecorder limits. */

export const RECORDER_MIME_CANDIDATES = [
  // iOS Safari (14.3+) records MP4/AAC
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
  // Chrome / Firefox / Android
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** First MIME type this device actually supports, or "" to let the browser choose. */
export function pickRecorderMime(): string {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") return "";
  const MR = window.MediaRecorder;
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    try {
      if (typeof MR.isTypeSupported === "function" && MR.isTypeSupported(candidate)) {
        return candidate;
      }
    } catch {
      /* keep trying */
    }
  }
  return "";
}

export function extensionForMime(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("mp4")) return "mp4";
  if (m.includes("aac")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "webm";
}

export function baseMime(mime: string): string {
  return (mime || "audio/webm").split(";")[0].trim();
}

export interface LevelMeter {
  stop: () => void;
}

/**
 * Drives the live waveform: RMS of the mic signal, smoothed and scaled to 0..1.
 */
export function startLevelMeter(
  stream: MediaStream,
  onLevel: (level: number) => void
): LevelMeter {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return { stop: () => undefined };

  const ctx = new Ctor();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.75;
  source.connect(analyser);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  let smoothed = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    // Map RMS (~0..0.3 for speech) into a usable 0..1 range.
    const scaled = Math.min(1, rms * 4.2);
    smoothed = smoothed * 0.72 + scaled * 0.28;
    onLevel(smoothed);
    raf = window.requestAnimationFrame(tick);
  };

  void ctx.resume().catch(() => undefined);
  raf = window.requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        /* ignore */
      }
      void ctx.close().catch(() => undefined);
      onLevel(0);
    },
  };
}
