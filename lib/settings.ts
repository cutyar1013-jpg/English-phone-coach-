import type { ScenarioId } from "./types";

export interface AppSettings {
  openaiKey: string;
  textModel: string;
  transcribeModel: string;
  ttsModel: string;
  voice: string;
  speed: number;
  autoPlay: boolean;
  azureKey: string;
  azureRegion: string;
  azureEnabled: boolean;
  scenarioId: ScenarioId;
  customTopic: string;
}

export const SETTINGS_KEY = "echo.settings.v1";
export const SESSION_KEY = "echo.session.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  openaiKey: "",
  textModel: "gpt-4o",
  transcribeModel: "whisper-1",
  ttsModel: "tts-1",
  voice: "nova",
  speed: 1,
  autoPlay: true,
  azureKey: "",
  azureRegion: "koreacentral",
  azureEnabled: false,
  scenarioId: "free-talk",
  customTopic: "",
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full / private mode — ignore */
  }
}

/**
 * Keys typed in the app travel as HTTPS headers on each request and are
 * never written to the server or to logs. Server-side .env keys always work
 * as a fallback, so an empty header simply means "use the server key".
 */
export function buildApiHeaders(settings: AppSettings, opts?: { azure?: boolean }): HeadersInit {
  const headers: Record<string, string> = {};
  if (settings.openaiKey.trim()) headers["x-openai-key"] = settings.openaiKey.trim();
  const azureOn = opts?.azure ?? settings.azureEnabled;
  if (azureOn) {
    if (settings.azureKey.trim()) headers["x-azure-key"] = settings.azureKey.trim();
    if (settings.azureRegion.trim()) headers["x-azure-region"] = settings.azureRegion.trim();
  }
  return headers;
}

export function hasClientKey(settings: AppSettings): boolean {
  return settings.openaiKey.trim().length > 0;
}
