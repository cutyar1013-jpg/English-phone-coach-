export type ScenarioId =
  | "free-talk"
  | "native-nuance"
  | "teaching"
  | "shadowing"
  | "custom";

export interface Scenario {
  id: ScenarioId;
  label: string;
  short: string;
  emoji: string;
  blurb: string;
  brief: string;
  starter: string;
  accent: string;
}

export interface PhraseUpgrade {
  original: string;
  better: string;
  note?: string;
}

export interface PronunciationTip {
  focus: string;
  ipa?: string;
  issue: string;
  drill?: string;
}

export interface VocabNote {
  term: string;
  meaning: string;
  example?: string;
}

export interface CoachFeedback {
  headline?: string;
  natural: PhraseUpgrade[];
  pronunciation: PronunciationTip[];
  intonation: string[];
  vocabulary: VocabNote[];
}

export interface PhonemeScore {
  phoneme: string;
  score: number;
}

export interface WordScore {
  word: string;
  score: number;
  errorType?: string;
  phonemes: PhonemeScore[];
}

export interface PronunciationAssessment {
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number;
  pronunciation: number;
  words: WordScore[];
  recognizedText?: string;
}

export type TurnRole = "coach" | "user";

export interface Turn {
  id: string;
  role: TurnRole;
  text: string;
  at: number;
  durationSec?: number;
  /** OpenAI coaching feedback (per user turn) */
  feedback?: CoachFeedback;
  /** Azure pronunciation assessment (per user turn, optional) */
  assessment?: PronunciationAssessment | null;
  /** ephemeral object URL for coach speech — never persisted */
  audioUrl?: string;
  /** true when the browser blocked autoplay and the user must tap */
  playBlocked?: boolean;
}

export interface CoachPayload {
  scenarioId: ScenarioId;
  topic: string;
  history: { role: "user" | "assistant"; content: string }[];
  voice: string;
  speed: number;
  models: { text: string; transcribe: string; tts: string };
  durationSec: number;
  azure: { enabled: boolean };
}

export interface CoachResponse {
  ok: boolean;
  transcript: string;
  reply: string;
  feedback: CoachFeedback;
  assessment: PronunciationAssessment | null;
  audioBase64: string | null;
  audioMime: string;
  warnings: string[];
  emptySpeech?: boolean;
  error?: string;
  message?: string;
}

export interface HealthResponse {
  ok: boolean;
  openaiServerKey: boolean;
  azureServerKey: boolean;
  azureRegion: string;
  defaults: { text: string; transcribe: string; tts: string };
}

export const EMPTY_FEEDBACK: CoachFeedback = {
  natural: [],
  pronunciation: [],
  intonation: [],
  vocabulary: [],
};
