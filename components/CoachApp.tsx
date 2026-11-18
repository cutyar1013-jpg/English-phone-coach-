"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  baseMime,
  extensionForMime,
  isRecordingSupported,
  pickRecorderMime,
  startLevelMeter,
  type LevelMeter,
} from "@/lib/audio";
import { base64ToBlob, countWords, formatClock, formatDuration, uid } from "@/lib/format";
import { getScenario, SCENARIOS } from "@/lib/scenarios";
import {
  DEFAULT_SETTINGS,
  SESSION_KEY,
  buildApiHeaders,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";
import type {
  CoachResponse,
  HealthResponse,
  ScenarioId,
  Turn,
} from "@/lib/types";
import { blobToWav16kMono, silentWavObjectUrl } from "@/lib/wav";
import type { CallStatus } from "./types";
import AudioVisualizer from "./AudioVisualizer";
import CoachAvatar from "./CoachAvatar";
import FeedbackCard from "./FeedbackCard";
import MicButton from "./MicButton";
import ReviewSheet from "./ReviewSheet";
import ScenarioSheet from "./ScenarioSheet";
import SettingsSheet from "./SettingsSheet";
import {
  GearIcon,
  HistoryIcon,
  PhoneOffIcon,
  PlayIcon,
  SparkIcon,
  VolumeIcon,
  WaveLogo,
  XIcon,
} from "./Icons";

const STATUS_LINE: Record<CallStatus, string> = {
  idle: "Line closed — tap the mic to call back",
  ready: "Tap the mic and talk · tap again to send",
  recording: "Listening…",
  processing: "Thinking about what you said",
  speaking: "Speaking — tap the mic to cut in",
};

const HINTS: Record<CallStatus, string> = {
  idle: "One tap starts the call",
  ready: "I'm listening",
  recording: "Tap to send",
  processing: "Coaching…",
  speaking: "Tap the mic to jump in",
};

export default function CoachApp() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [recSeconds, setRecSeconds] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const [recheckBusyId, setRecheckBusyId] = useState<string | null>(null);
  const [secureContext, setSecureContext] = useState(true);

  const statusRef = useRef<CallStatus>("idle");
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const turnsRef = useRef<Turn[]>([]);
  const healthRef = useRef<HealthResponse | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meterRef = useRef<LevelMeter | null>(null);
  const levelRef = useRef(0);
  const recTimerRef = useRef<number | null>(null);
  const recSecondsRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const objectUrlsRef = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const wavByTurnRef = useRef<Map<string, Blob>>(new Map());
  const discardCaptureRef = useRef(false);

  const setStatusSafe = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    settingsRef.current = settings;
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  /* ── boot: settings, saved session, server capability ─────────────── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSecureContext(
        window.isSecureContext ||
          ["localhost", "127.0.0.1"].includes(window.location.hostname)
      );
    }

    const loaded = loadSettings();
    setSettings(loaded);
    settingsRef.current = loaded;

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { turns?: Turn[]; callSeconds?: number };
        if (Array.isArray(parsed.turns) && parsed.turns.length > 0) {
          setTurns(
            parsed.turns.map((t) => ({ ...t, audioUrl: undefined, playBlocked: false }))
          );
          setCallSeconds(typeof parsed.callSeconds === "number" ? parsed.callSeconds : 0);
          statusRef.current = "ready";
          setStatus("ready");
        }
      }
    } catch {
      /* corrupt session — start clean */
    }

    setHydrated(true);

    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  /* ── call clock ───────────────────────────────────────────────────── */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (statusRef.current !== "idle") setCallSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  /* ── persist transcript (audio blobs are intentionally not stored) ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload = {
        turns: turns.map((t) => ({ ...t, audioUrl: undefined, playBlocked: false })),
        callSeconds,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* quota — ignore */
    }
  }, [turns, hydrated, callSeconds]);

  /* ── auto-scroll the transcript ───────────────────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = window.setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [turns.length, status]);

  /* ── toast auto-hide ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const trackUrl = useCallback((url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  const requestTts = useCallback(
    async (text: string, s: AppSettings): Promise<{ base64: string; mime: string } | null> => {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildApiHeaders(s, { azure: false }),
        },
        body: JSON.stringify({
          text,
          voice: s.voice,
          speed: s.speed,
          model: s.ttsModel,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        audioBase64?: string;
        audioMime?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.audioBase64) return null;
      return { base64: data.audioBase64, mime: data.audioMime || "audio/mpeg" };
    },
    []
  );

  const playUrl = useCallback(
    async (url: string, turnId?: string) => {
      const el = audioRef.current;
      if (!el) return;
      el.src = url;
      try {
        await el.play();
        if (statusRef.current !== "idle") setStatusSafe("speaking");
      } catch {
        if (statusRef.current === "speaking") setStatusSafe("ready");
        if (turnId) {
          setTurns((prev) =>
            prev.map((t) => (t.id === turnId ? { ...t, playBlocked: true } : t))
          );
        }
      }
    },
    [setStatusSafe]
  );

  const stopPlayback = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, []);

  const unlockAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el || audioUnlockedRef.current) return;
    el.src = silentWavObjectUrl();
    el.play()
      .then(() => {
        el.pause();
        audioUnlockedRef.current = true;
      })
      .catch(() => undefined);
  }, []);

  const speakInto = useCallback(
    async (turnId: string, text: string) => {
      const s = settingsRef.current;
      if (!s.openaiKey.trim() && !healthRef.current?.openaiServerKey) return;
      try {
        const audio = await requestTts(text, s);
        if (!audio) return;
        const url = trackUrl(URL.createObjectURL(base64ToBlob(audio.base64, audio.mime)));
        setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, audioUrl: url } : t)));
        if (statusRef.current === "ready") await playUrl(url, turnId);
      } catch {
        /* greeting audio is a nicety, never an error */
      }
    },
    [playUrl, requestTts, trackUrl]
  );

  const startCall = useCallback(
    async (withVoice: boolean) => {
      if (statusRef.current !== "idle") return;
      setStatusSafe("ready");
      setCallSeconds(0);
      unlockAudio();

      if (turnsRef.current.length === 0) {
        const scenario = getScenario(settingsRef.current.scenarioId);
        const greeting: Turn = {
          id: uid(),
          role: "coach",
          text: scenario.starter,
          at: Date.now(),
        };
        setTurns([greeting]);
        if (withVoice) void speakInto(greeting.id, scenario.starter);
      }
    },
    [setStatusSafe, speakInto, unlockAudio]
  );

  const cleanupCapture = useCallback(() => {
    if (recTimerRef.current !== null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    meterRef.current?.stop();
    meterRef.current = null;
    levelRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const handleClip = useCallback(
    async (rawBlob: Blob, durationSec: number) => {
      if (durationSec < 0.45 || rawBlob.size < 1200) {
        setStatusSafe("ready");
        setToast("Too quick — say a full sentence and tap again.");
        return;
      }

      const s = settingsRef.current;
      const azureConfigured =
        s.azureEnabled && (!!s.azureKey.trim() || !!healthRef.current?.azureServerKey);

      let upload: Blob = rawBlob;
      let filename = `speech.${extensionForMime(baseMime(rawBlob.type))}`;
      let wav: Blob | null = null;

      if (azureConfigured) {
        try {
          wav = await blobToWav16kMono(rawBlob);
          upload = wav;
          filename = "speech.wav";
        } catch {
          setToast("Couldn't prepare audio for Azure — scoring skipped this turn.");
        }
      }

      const history = turnsRef.current
        .filter((t) => t.text.trim().length > 0)
        .slice(-10)
        .map((t) => ({ role: t.role === "coach" ? ("assistant" as const) : ("user" as const), content: t.text }));

      const form = new FormData();
      form.append("audio", upload, filename);
      form.append(
        "payload",
        JSON.stringify({
          scenarioId: s.scenarioId,
          topic: s.scenarioId === "custom" ? s.customTopic : "",
          history,
          voice: s.voice,
          speed: s.speed,
          models: { text: s.textModel, transcribe: s.transcribeModel, tts: s.ttsModel },
          durationSec,
          azure: { enabled: !!wav },
        })
      );

      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: buildApiHeaders(s, { azure: !!wav }),
          body: form,
        });
        const data = (await res.json()) as Partial<CoachResponse> & {
          error?: string;
          message?: string;
        };

        if (!res.ok || !data.ok) {
          setStatusSafe("ready");
          if (data.error === "missing_openai_key" || data.error === "invalid_openai_key") {
            setKeyMissing(true);
            setSettingsOpen(true);
          }
          setError(data.message || "The coach couldn't answer. Try again in a second.");
          return;
        }

        if (data.emptySpeech || !data.transcript) {
          setStatusSafe("ready");
          setToast("I didn't catch any words — try once more, a little closer to the mic.");
          return;
        }

        const userTurn: Turn = {
          id: uid(),
          role: "user",
          text: data.transcript,
          at: Date.now(),
          durationSec,
          feedback: data.feedback,
          assessment: data.assessment ?? null,
        };
        const coachTurn: Turn = {
          id: uid(),
          role: "coach",
          text: data.reply ?? "",
          at: Date.now() + 1,
        };
        if (data.audioBase64) {
          coachTurn.audioUrl = trackUrl(
            URL.createObjectURL(base64ToBlob(data.audioBase64, data.audioMime || "audio/mpeg"))
          );
        }
        if (wav) wavByTurnRef.current.set(userTurn.id, wav);

        setTurns((prev) => [...prev, userTurn, coachTurn]);
        setKeyMissing(false);

        const warnings = data.warnings ?? [];
        if (warnings.length > 0) console.warn("[echo]", ...warnings);

        if (coachTurn.audioUrl && settingsRef.current.autoPlay) {
          await playUrl(coachTurn.audioUrl, coachTurn.id);
        } else {
          setStatusSafe("ready");
          if (!coachTurn.audioUrl) setToast("Reply ready — voice unavailable, read it instead.");
        }
      } catch {
        setStatusSafe("ready");
        setError("Network hiccup — check your connection and try again.");
      }
    },
    [playUrl, setStatusSafe, trackUrl]
  );

  const startRecording = useCallback(async () => {
    if (statusRef.current === "recording" || statusRef.current === "processing") return;
    setError(null);

    if (!isRecordingSupported()) {
      setError(
        "This browser can't record audio. Use Safari on iPhone or Chrome on desktop, served over HTTPS or localhost."
      );
      return;
    }

    if (statusRef.current === "idle") await startCall(false);
    stopPlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const mime = pickRecorderMime();
      let recorder: MediaRecorder;
      try {
        recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 })
          : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        cleanupCapture();
        setStatusSafe("ready");
        setError("Recording stopped unexpectedly. Try again.");
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks, { type });
        const duration = recSecondsRef.current;
        const discard = discardCaptureRef.current;
        discardCaptureRef.current = false;
        cleanupCapture();
        if (discard) {
          setStatusSafe("idle");
          return;
        }
        void handleClip(blob, duration);
      };

      discardCaptureRef.current = false;
      recorderRef.current = recorder;
      recorder.start(200);

      const startedAt = Date.now();
      recSecondsRef.current = 0;
      setRecSeconds(0);
      recTimerRef.current = window.setInterval(() => {
        const secs = (Date.now() - startedAt) / 1000;
        recSecondsRef.current = secs;
        setRecSeconds(secs);
        if (secs >= 120 && recorder.state === "recording") {
          try {
            recorder.stop();
          } catch {
            /* ignore */
          }
          setStatusSafe("processing");
        }
      }, 120);

      meterRef.current = startLevelMeter(stream, (value) => {
        levelRef.current = value;
      });
      setStatusSafe("recording");
    } catch (err) {
      cleanupCapture();
      setStatusSafe("ready");
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          "Microphone access was blocked. In Safari tap “aA” → Website Settings → Microphone → Allow, then reload."
        );
      } else if (name === "NotFoundError") {
        setError("No microphone was found on this device.");
      } else {
        setError("Couldn't start the microphone. " + (err instanceof Error ? err.message : ""));
      }
    }
  }, [cleanupCapture, handleClip, setStatusSafe, startCall, stopPlayback]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setStatusSafe("processing");
    try {
      recorder.stop();
    } catch {
      cleanupCapture();
      setStatusSafe("ready");
    }
  }, [cleanupCapture, setStatusSafe]);

  const toggleMic = useCallback(() => {
    if (statusRef.current === "recording") stopRecording();
    else if (statusRef.current === "processing") return;
    else {
      stopPlayback();
      void startRecording();
    }
  }, [startRecording, stopPlayback, stopRecording]);

  const endCall = useCallback(() => {
    stopPlayback();
    // Ending the call discards whatever was mid-recording instead of sending it.
    discardCaptureRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        discardCaptureRef.current = false;
      }
    }
    cleanupCapture();
    setStatusSafe("idle");
  }, [cleanupCapture, setStatusSafe, stopPlayback]);

  const playPhrase = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      stopPlayback();
      try {
        const audio = await requestTts(text, settingsRef.current);
        if (!audio) {
          setToast("Couldn't generate that audio — check your OpenAI key.");
          return;
        }
        const url = trackUrl(URL.createObjectURL(base64ToBlob(audio.base64, audio.mime)));
        await playUrl(url);
      } catch {
        setToast("Couldn't generate that audio.");
      }
    },
    [playUrl, requestTts, stopPlayback, trackUrl]
  );

  const previewVoice = useCallback(
    async (draft: AppSettings) => {
      const sample = "Here's how I sound. Tell me when you're ready, and we'll start the call.";
      const audio = await requestTts(sample, draft);
      if (!audio) {
        setToast("No audio — check your OpenAI key first.");
        return;
      }
      const url = trackUrl(URL.createObjectURL(base64ToBlob(audio.base64, audio.mime)));
      await playUrl(url);
    },
    [playUrl, requestTts, trackUrl]
  );

  const recheckPronunciation = useCallback(async (turn: Turn) => {
    const wav = wavByTurnRef.current.get(turn.id);
    if (!wav) {
      setToast("That clip isn't on this device any more — say it again to score it.");
      return;
    }
    setRecheckBusyId(turn.id);
    try {
      const form = new FormData();
      form.append("audio", wav, "speech.wav");
      form.append("text", turn.text);
      const res = await fetch("/api/pronunciation", {
        method: "POST",
        headers: buildApiHeaders(settingsRef.current, { azure: true }),
        body: form,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        assessment?: Turn["assessment"];
        message?: string;
      };
      if (!res.ok || !data.ok || !data.assessment) {
        setToast(data.message || "Couldn't score that clip.");
        return;
      }
      setTurns((prev) =>
        prev.map((t) => (t.id === turn.id ? { ...t, assessment: data.assessment ?? null } : t))
      );
    } catch {
      setToast("Pronunciation scoring failed — try again.");
    } finally {
      setRecheckBusyId(null);
    }
  }, []);

  const clearSession = useCallback(() => {
    stopPlayback();
    discardCaptureRef.current = true;
    cleanupCapture();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    wavByTurnRef.current.clear();
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setTurns([]);
    setCallSeconds(0);
    setRecSeconds(0);
    setStatusSafe("idle");
  }, [cleanupCapture, setStatusSafe, stopPlayback]);

  const selectScenario = useCallback((id: ScenarioId, topic: string) => {
    setSettings((prev) => ({ ...prev, scenarioId: id, customTopic: topic }));
  }, []);

  useEffect(() => {
    return () => {
      cleanupCapture();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [cleanupCapture]);

  const scenario = getScenario(settings.scenarioId);
  const azureAvailable =
    settings.azureEnabled && (!!settings.azureKey.trim() || !!health?.azureServerKey);
  const needsKey = hydrated && !settings.openaiKey.trim() && health !== null && !health.openaiServerKey;

  const stats = useMemo(() => {
    const userTurns = turns.filter((t) => t.role === "user");
    return {
      userTurns: userTurns.length,
      words: userTurns.reduce((sum, t) => sum + countWords(t.text), 0),
    };
  }, [turns]);

  const lastUserTurnId = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i].role === "user") return turns[i].id;
    }
    return null;
  }, [turns]);

  const showHero = turns.length === 0;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {/* header */}
      <header className="flex items-center justify-between px-4 pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <WaveLogo className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold leading-none tracking-tight text-white">Echo</p>
            <p className="mt-1 text-[9.5px] uppercase tracking-[0.2em] text-white/30">Phone coach</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            aria-label="Session review"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 active:scale-95"
          >
            <HistoryIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 active:scale-95"
          >
            <GearIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* call card */}
      <div className="px-4 pt-3.5">
        <div className="glass px-4 py-3.5">
          <div className="flex items-center gap-3">
            <CoachAvatar status={status} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[14px] font-semibold text-white/95">{scenario.label}</p>
                {status !== "idle" ? (
                  <span className="flex items-center gap-1 rounded-full bg-mint/10 px-1.5 py-[1px] text-[8.5px] font-semibold uppercase tracking-[0.12em] text-mint">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-mint" />
                    Live
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-[11.5px] text-white/45">{STATUS_LINE[status]}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-[20px] font-medium leading-none tabular-nums text-white/90">
                {formatClock(callSeconds)}
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-white/30">
                {settings.voice} · {settings.speed.toFixed(2)}×
              </p>
            </div>
          </div>
          <AudioVisualizer levelRef={levelRef} status={status} className="mt-2.5" />
        </div>
      </div>

      {/* notices */}
      {!secureContext ? (
        <div className="mx-4 mt-3 rounded-2xl border border-amber/25 bg-amber/[0.08] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-amber/90">
          The microphone needs HTTPS (or localhost). Open the deployed Vercel URL — iOS Safari blocks
          recording on plain HTTP.
        </div>
      ) : null}

      {needsKey ? (
        <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-2xl border border-aqua/25 bg-aqua/[0.07] px-3.5 py-3">
          <SparkIcon className="mt-0.5 h-4 w-4 shrink-0 text-aqua" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-white/85">Add your OpenAI API key</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">
              It stays in this browser. Paste it once and the coach starts working.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 rounded-full bg-aqua px-3 py-1.5 text-[11px] font-semibold text-ink-950"
          >
            Add
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl border border-coral/25 bg-coral/[0.08] px-3.5 py-2.5">
          <p className="flex-1 text-[11.5px] leading-relaxed text-coral/90">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="mt-0.5 text-coral/60"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* transcript */}
      <main
        ref={scrollRef}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4"
      >
        {showHero ? (
          <div className="flex flex-col items-center pt-1 text-center animate-fade">
            <CoachAvatar status="ready" size={84} live={false} />
            <h1 className="mt-5 text-[24px] font-semibold leading-tight tracking-tight text-white">
              Speak. Get corrected.
              <br />
              <span className="bg-gradient-to-r from-aqua via-sky to-violet bg-clip-text text-transparent">
                Sound native.
              </span>
            </h1>
            <p className="mt-2.5 max-w-[290px] text-[12.5px] leading-relaxed text-white/45">
              A phone call with a native coach who rewrites your phrasing and scores every stressed
              syllable — built for advanced speakers.
            </p>

            <div className="mt-5 grid w-full grid-cols-2 gap-2">
              {SCENARIOS.filter((s) => s.id !== "custom").map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectScenario(s.id, "")}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition ${
                    settings.scenarioId === s.id
                      ? "border-aqua/40 bg-aqua/[0.08]"
                      : "border-white/[0.08] bg-white/[0.03] active:scale-[0.99]"
                  }`}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span
                    className={`text-[11.5px] font-medium leading-tight ${
                      settings.scenarioId === s.id ? "text-aqua" : "text-white/70"
                    }`}
                  >
                    {s.short}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                unlockAudio();
                void startCall(true);
              }}
              className="btn-primary mt-4 w-full py-3.5 text-[15px]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-950/15">
                <PlayIcon className="h-2.5 w-2.5" />
              </span>
              Start the call
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {turns.map((turn) =>
              turn.role === "coach" ? (
                <div key={turn.id} className="flex items-start gap-2.5 animate-rise">
                  <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-aqua via-sky to-violet p-[1px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-ink-900">
                      <WaveLogo className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.05] px-3.5 py-2.5">
                    <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-white/90">
                      {turn.text}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          turn.audioUrl ? playUrl(turn.audioUrl, turn.id) : playPhrase(turn.text)
                        }
                        className="flex items-center gap-1 text-[10.5px] text-white/40 active:scale-95"
                      >
                        {turn.audioUrl ? (
                          <PlayIcon className="h-2.5 w-2.5" />
                        ) : (
                          <VolumeIcon className="h-3 w-3" />
                        )}
                        {turn.playBlocked ? "Tap to hear" : "Replay"}
                      </button>
                      <span className="text-[9.5px] text-white/20">
                        {new Date(turn.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={turn.id} className="flex flex-col items-end animate-rise">
                  <div className="max-w-[88%] rounded-2xl rounded-tr-md border border-aqua/20 bg-gradient-to-br from-aqua/[0.16] to-sky/[0.09] px-3.5 py-2.5">
                    <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-white/95">
                      {turn.text}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-2 text-[9.5px] text-white/35">
                      {turn.durationSec ? <span>{formatDuration(turn.durationSec)}</span> : null}
                      <span>
                        {new Date(turn.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="w-full max-w-[94%]">
                    <FeedbackCard
                      turn={turn}
                      defaultOpen={turn.id === lastUserTurnId}
                      onPlayPhrase={playPhrase}
                      onRecheck={() => void recheckPronunciation(turn)}
                      recheckBusy={recheckBusyId === turn.id}
                      azureAvailable={azureAvailable}
                    />
                  </div>
                </div>
              )
            )}

            {status === "processing" ? (
              <div className="flex items-center gap-2.5 animate-fade">
                <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-aqua via-sky to-violet p-[1px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-ink-900">
                    <WaveLogo className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.05] px-3.5 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.12}s`, animationDuration: "0.9s" }}
                    />
                  ))}
                  <span className="ml-1 text-[11px] text-white/40">transcribing &amp; coaching</span>
                </div>
              </div>
            ) : null}

            <div className="h-1" />
          </div>
        )}
      </main>

      {/* controls */}
      <footer className="relative border-t border-white/[0.06] bg-ink-950/60 px-4 pt-3 backdrop-blur-xl safe-bottom">
        <div className="mb-2 flex h-4 items-center justify-center gap-2 text-[10.5px] text-white/40">
          {status === "recording" ? (
            <span className="flex items-center gap-1.5 font-medium text-coral">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" />
              REC {formatClock(recSeconds)}
            </span>
          ) : (
            <span>{HINTS[status]}</span>
          )}
          {stats.userTurns > 0 ? (
            <span className="text-white/20">
              · {stats.userTurns} turn{stats.userTurns > 1 ? "s" : ""}, {stats.words} words
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 pb-1">
          <button
            type="button"
            onClick={() => setScenarioOpen(true)}
            aria-label="Change scenario"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-base active:scale-95"
          >
            {scenario.emoji}
          </button>

          <MicButton
            status={status}
            onClick={toggleMic}
            disabled={status === "processing"}
          />

          {status === "idle" ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Voice and speed"
              className="flex h-11 w-11 flex-col items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[8px] font-semibold uppercase tracking-wider text-white/45 active:scale-95"
            >
              <span className="text-[11px] font-mono normal-case tracking-normal text-white/70">
                {settings.speed.toFixed(1)}×
              </span>
              speed
            </button>
          ) : (
            <button
              type="button"
              onClick={endCall}
              aria-label="End the call"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral active:scale-95"
            >
              <PhoneOffIcon className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </footer>

      {toast ? (
        <div className="pointer-events-none fixed bottom-[150px] left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-ink-800/95 px-4 py-2 text-[11.5px] text-white/80 shadow-card backdrop-blur animate-fade">
          {toast}
        </div>
      ) : null}

      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onEnded={() => {
          if (statusRef.current === "speaking") setStatusSafe("ready");
        }}
        onError={() => {
          if (statusRef.current === "speaking") setStatusSafe("ready");
        }}
        className="hidden"
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={(next) => {
          setSettings(next);
          settingsRef.current = next;
          setKeyMissing(false);
        }}
        onReset={() => {
          setSettings(DEFAULT_SETTINGS);
          settingsRef.current = DEFAULT_SETTINGS;
        }}
        health={health}
        onPreviewVoice={previewVoice}
        onClearSession={() => {
          clearSession();
          setSettingsOpen(false);
        }}
      />

      <ScenarioSheet
        open={scenarioOpen}
        onClose={() => setScenarioOpen(false)}
        scenarioId={settings.scenarioId}
        topic={settings.customTopic}
        onSelect={selectScenario}
      />

      <ReviewSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        turns={turns}
        callSeconds={callSeconds}
        onClear={clearSession}
      />
    </div>
  );
}
