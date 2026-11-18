import type { Scenario, ScenarioId } from "./types";

export const SCENARIOS: Scenario[] = [
  {
    id: "free-talk",
    label: "Free Talk",
    short: "Free Talk",
    emoji: "💬",
    accent: "from-aqua/25 to-sky/10",
    blurb: "Whatever is on your mind — kept at a native pace.",
    brief: `CASUAL FREE CONVERSATION.
Follow whatever they bring up — work, culture, travel, a film, an argument they had. Be curious and a little opinionated so the conversation has texture. Push back sometimes; agree sometimes. The point is a real conversation at native speed, not an interview.`,
    starter:
      "Hey, it's Echo — line's open. What's going on with you today?",
  },
  {
    id: "native-nuance",
    label: "Native Nuance & Idioms",
    short: "Native Nuance",
    emoji: "🎭",
    accent: "from-violet/25 to-aqua/10",
    blurb: "Rewrite your English the way a native would actually say it.",
    brief: `NATIVE NUANCE & IDIOM DRILL.
Your job is to move their English from "correct" to "native". Each turn:
1) React to what they said like a friend would.
2) Offer up to 3 upgrades: the words they used vs. the words a native speaker would actually reach for — collocations, phrasal verbs, register, a well-placed idiom.
3) Plant ONE target expression (idiom, phrasal verb, or nuance word) and ask them to use it in their next answer. Check whether they used the previous one.
Keep idioms current and spoken — no textbook clichés ("it's raining cats and dogs"). Flag register: what works in a bar does not work in a boardroom.`,
    starter:
      "Okay, let's make you sound like you actually live there. Give me something you'd say at work this week and I'll rough it up into native English.",
  },
  {
    id: "teaching",
    label: "Teaching & Academic",
    short: "Teaching Talk",
    emoji: "🎓",
    accent: "from-sky/25 to-violet/10",
    blurb: "ELT methodology, classroom dynamics, linguistics — peer to peer.",
    brief: `PROFESSIONAL / ACADEMIC DISCUSSION WITH A PEER.
They are an English teacher. Talk shop as a fellow professional: second-language acquisition, methodology, classroom management, assessment and washback, materials design, phonology, corpus findings, education policy. Use precise academic vocabulary (scaffolding, noticing, uptake, interlanguage, corrective feedback, washback, threshold hypothesis) without explaining it. Disagree when you have a reason. Coach them toward the register of a conference talk or a staff meeting: hedged claims, signposting, precise verbs.`,
    starter:
      "Hi — let's talk shop. What's been on your mind in the classroom lately?",
  },
  {
    id: "shadowing",
    label: "Shadowing & Intonation",
    short: "Shadowing",
    emoji: "🎵",
    accent: "from-amber/25 to-coral/10",
    blurb: "Short model lines, repeated back — rhythm and melody drilled.",
    brief: `SHADOWING & INTONATION DRILL.
Give them ONE short model line per turn: 8–16 words, natural spoken English, with a clear intonation contour. Mark the stressed syllables in the line using CAPITALS, e.g. "I'd RATHER not get into it right NOW."
Then:
- If their audio is a repetition of your line, diagnose their delivery against it: which words lost their stress, where the linking or flap failed, whether the pitch fell where it should. Be surgical.
- If they said something else, treat it as their own line and coach its rhythm instead, then offer the next model line.
In pronunciation[], always name the exact syllable and give a repeatable drill. Keep the whole reply under 3 sentences so there is room for their next repetition.`,
    starter:
      "Ready when you are. Repeat after me and I'll tell you exactly where your rhythm drifts: \"I would have TOLD you if I'd KNOWN it MATtered.\"",
  },
  {
    id: "custom",
    label: "Custom Topic",
    short: "Custom",
    emoji: "✨",
    accent: "from-mint/25 to-aqua/10",
    blurb: "Type your own scenario and the coach plays along.",
    brief: `CUSTOM SCENARIO.
Play the role or discuss the topic the user typed in THEIR TOPIC as naturally as possible. If it is a role-play (interview, negotiation, parent meeting, conference Q&A), stay in character and keep it moving; if it is a discussion topic, be a well-informed conversation partner. Coach their phrasing and delivery exactly as in a normal coaching call.`,
    starter:
      "Tell me where we're starting, and I'll follow your lead.",
  },
];

export function getScenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

export const VOICES = [
  { id: "nova", label: "Nova", note: "warm · female · default" },
  { id: "shimmer", label: "Shimmer", note: "bright · female" },
  { id: "alloy", label: "Alloy", note: "neutral · androgynous" },
  { id: "onyx", label: "Onyx", note: "deep · male" },
  { id: "echo", label: "Echo", note: "clear · male" },
  { id: "fable", label: "Fable", note: "expressive · British-leaning" },
  { id: "sage", label: "Sage", note: "calm · female" },
  { id: "coral", label: "Coral", note: "energetic · female" },
] as const;

export const TEXT_MODELS = [
  { id: "gpt-4o", label: "gpt-4o", note: "best coaching quality" },
  { id: "gpt-4o-mini", label: "gpt-4o-mini", note: "faster · cheaper" },
  { id: "gpt-4.1", label: "gpt-4.1", note: "strong reasoning" },
  { id: "gpt-4.1-mini", label: "gpt-4.1-mini", note: "balanced" },
] as const;

export const TRANSCRIBE_MODELS = [
  { id: "whisper-1", label: "whisper-1", note: "most compatible · default" },
  { id: "gpt-4o-transcribe", label: "gpt-4o-transcribe", note: "most accurate" },
  { id: "gpt-4o-mini-transcribe", label: "gpt-4o-mini-transcribe", note: "fastest" },
] as const;

export const TTS_MODELS = [
  { id: "tts-1", label: "tts-1", note: "fast · default" },
  { id: "tts-1-hd", label: "tts-1-hd", note: "crisper audio" },
  { id: "gpt-4o-mini-tts", label: "gpt-4o-mini-tts", note: "most natural" },
] as const;

export const AZURE_REGIONS = [
  "eastus",
  "eastus2",
  "westus",
  "westus2",
  "westus3",
  "centralus",
  "northeurope",
  "westeurope",
  "uksouth",
  "southeastasia",
  "eastasia",
  "japaneast",
  "koreacentral",
  "australiaeast",
  "canadacentral",
  "brazilsouth",
  "centralindia",
] as const;
