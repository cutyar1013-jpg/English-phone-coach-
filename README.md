# Echo — 전화영어 · 발음교정 웹앱

> **말하고, 교정받고, 원어민처럼.**
> 고급 영어 학습자(영어 교사)를 위한 **모바일 우선(iPhone Safari PWA) 전화 영어 코치**입니다.
> 실제 대화를 나누면서 ①원어민식 표현 교정 ②단어·음소 단위 발음/강세/억양 피드백 ③원어민 음성 모델을 한 화면에서 받습니다.

- **스택**: Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Web Audio / MediaRecorder · OpenAI (Whisper · GPT · TTS) · (선택) Azure Speech Pronunciation Assessment
- **배포**: 로컬 `npm run dev` / Vercel zero-config 배포
- **설계 원칙**: OpenAI 키만 있으면 **모든 기능이 바로 동작**하고, Azure는 설정에서 켜는 **선택 기능**입니다.

---

## 1. 1분 만에 실행하기

```bash
cd english-phone-coach
npm install
cp .env.example .env.local     # OPENAI_API_KEY=sk-... 입력
npm run dev
```

→ 브라우저에서 <http://localhost:3000> 접속 → 마이크 허용 → 마이크 버튼을 눌러 통화 시작.

> Node.js **18.18 이상** 필요 (권장 20/22 LTS).
> 로컬에서도 마이크는 `localhost` 또는 HTTPS에서만 동작합니다(브라우저 보안 정책).

### 키를 넣는 두 가지 방법

| 방법 | 설정 위치 | 특징 |
| --- | --- | --- |
| **A. 서버 키** | `.env.local` 또는 Vercel 환경변수 `OPENAI_API_KEY` | 앱을 쓰는 모든 기기에서 바로 동작. 배포용으로 권장 |
| **B. BYOK (내 키)** | 앱 우측 상단 **⚙ Settings → API key** | 키가 **내 브라우저(localStorage)에만** 저장되고, 요청마다 HTTPS 헤더(`x-openai-key`)로만 전송. 서버·로그·저장소에 남지 않음 |

둘 다 없으면 앱이 "Add your OpenAI API key" 안내와 함께 설정 화면을 열어 줍니다.

---

## 2. 1분 Vercel 배포

### 방법 1 — GitHub 연동 (권장, 이후 자동 배포)

1. <https://vercel.com/new> → **Import Git Repository** → 이 저장소 선택
2. **Environment Variables** 에 `OPENAI_API_KEY` 추가 (선택: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`)
3. **Deploy** 클릭 → 끝. `https://<프로젝트>.vercel.app` 주소로 바로 사용

### 방법 2 — CLI

```bash
npm i -g vercel
vercel            # 프로젝트 연결
vercel env add OPENAI_API_KEY   # 값 입력 (Production/Preview/Development)
vercel --prod
```

> ⚠️ 마이크는 **HTTPS에서만** 동작합니다. Vercel 주소(`https://…`)는 자동으로 HTTPS이므로 그대로 사용하면 됩니다.

---

## 3. iPhone에서 앱처럼 쓰기 (홈 화면 추가)

1. Safari에서 배포 주소 접속
2. 하단 **공유** 버튼 → **홈 화면에 추가**
3. 홈 화면의 **Echo** 아이콘 실행 → 상태바까지 꽉 찬 전체 화면(standalone)으로 실행됩니다.

- `public/manifest.json` + `apple-mobile-web-app-*` 메타태그 + 180/192/512/1024 아이콘이 포함되어 있습니다.
- 첫 실행 시 **마이크 허용**을 눌러 주세요. 거부했다면 Safari 주소창의 **aA → 웹사이트 설정 → 마이크 → 허용** 후 새로고침.
- iOS는 자동재생을 제한합니다. 앱은 **첫 탭에서 무음 오디오로 재생을 잠금 해제**하고, 그래도 막히면 말풍선에 **"Tap to hear"** 버튼이 나타납니다.

---

## 4. 화면과 사용법

```
┌──────────────────────────────┐
│ Echo  ·  ⚙ Settings  ⟲ 리뷰  │
│ ┌──────────────────────────┐ │
│ │  ◉  Free Talk   ● LIVE   │ │  ← 통화 카드: 상태 · 타이머 · 실시간 파형
│ │  00:42      nova · 1.00× │ │
│ │  ▁▂▅▇▅▃▂▁▂▅▇▅▂▁          │ │
│ └──────────────────────────┘ │
│  코치 말풍선 (▶ Replay)       │
│  내 말풍선 (녹음 길이·시각)     │
│   └ Coach notes ▾            │  ← 접이식 피드백 카드
│      Accuracy 88 · Fluency 76│
│      단어별 점수 → 음소별 점수  │
│      Say it more naturally   │
│      Pronunciation & stress  │
│      [Play native model]     │
│ ┌──────────────────────────┐ │
│ │  ( 🎤 )   탭해서 말하기     │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### 통화 흐름

1. **Start the call** (또는 마이크 버튼) → 코치가 시나리오에 맞는 첫마디를 음성으로 건넵니다.
2. **마이크 버튼 탭 → 말하기 → 다시 탭**하면 전송. (녹음 중 실시간 레벨/파형, 최대 2분)
3. 잠시 뒤 **"transcribing & coaching"** → 코치의 음성 답변이 자동 재생되고, 내 발화 아래에 **Coach notes** 카드가 열립니다.
4. 코치가 말하는 중에 마이크를 누르면 **말을 끊고 바로 답하기**(interrupt)가 됩니다.
5. 오른쪽 아래 **📵 End** 로 통화 종료, 다시 누르면 이어서 통화.

### 시나리오

| 시나리오 | 내용 |
| --- | --- |
| 💬 **Free Talk** | 무엇이든 자유 대화. 원어민 속도와 리듬 유지 |
| 🎭 **Native Nuance & Idioms** | 내 문장 → 원어민이 실제로 쓰는 문장으로 리라이트, 매 턴 타깃 표현 1개 제시 |
| 🎓 **Teaching & Academic** | ELT 방법론·평가·언어학·수업 운영. 동료 전문가 레지스터로 대화 |
| 🎵 **Shadowing & Intonation** | 짧은 모델 문장(강세 대문자 표기) → 따라 말하기 → 리듬·연음·억양 진단 |
| ✨ **Custom Topic** | 직접 입력한 롤플레이/주제(예: 학부모 면담에서 학부모 역할) |

### 피드백 카드 읽는 법

- **점수 타일**: Accuracy / Fluency / Completeness / Prosody (Azure 사용 시). **85점 이상 초록 · 65–84 노랑 · 65점 미만 빨강**.
- **Word by word**: 단어를 탭하면 **음소 단위 점수**(`/s/ /t/ /uː/ …`)가 펼쳐집니다. 어떤 소리가 무너졌는지 바로 확인.
- **Say it more naturally**: 내가 한 말(취소선) → 원어민 표현 + **왜 그런지** 한 줄 설명. 각 항목의 ▶ 로 그 표현만 원어민 음성으로 듣기.
- **Pronunciation & stress**: 단어 · IPA · 원인(예: `/dʒd/` 클러스터 탈락) · 따라 말하기 드릴.
- **Intonation**: 사고 단위(thought group) 기준 피치 상승/하강, 핵심 강세 위치.
- **Play native model**: 카드 전체에서 가장 중요한 표현을 TTS로 재생.
- **Score pronunciation / Re-score**: Azure가 켜져 있고 이 턴의 WAV가 남아 있으면 `/api/pronunciation`으로 **재채점**.

### 세션 리뷰

상단 **⟲ Session review** — 통화 시간, 내 턴 수, 발화 단어 수, 말한 시간, 평균 점수, **모은 표현 업그레이드 목록**, **연습할 발음 목록**. 대화는 기기에 자동 저장되며(오디오 제외), **Start a fresh session**으로 초기화합니다.

---

## 5. 설정 (⚙)

| 항목 | 설명 |
| --- | --- |
| **API key** | BYOK. 비워 두면 서버 `.env` 키 사용 |
| **Coaching model** | `gpt-4o`(기본, 피드백 품질 최상) · `gpt-4o-mini`(빠름·저렴) · `gpt-4.1` · `gpt-4.1-mini` |
| **Transcription** | `whisper-1`(기본, 호환성 최고) · `gpt-4o-transcribe`(정확도) · `gpt-4o-mini-transcribe`(속도) |
| **Voice model** | `tts-1`(기본) · `tts-1-hd`(선명) · `gpt-4o-mini-tts`(가장 자연스러움) |
| **Coach voice** | nova · shimmer · alloy · onyx · echo · fable · sage · coral + **미리듣기** |
| **Speaking speed** | 0.60× ~ 1.40× (원어민 속도 1.00×) |
| **Auto-play reply** | 코치 답변 자동 재생 on/off |
| **Azure pronunciation** | 켜면 매 턴 단어/음소/프로소디 채점. 키·리전 입력 또는 서버 키 사용 |
| **Clear conversation history** | 대화 기록 삭제 |

---

## 6. Azure 발음 평가 (선택)

OpenAI만으로도 발음 코칭(IPA·강세·연음 설명)은 동작합니다. **점수(0–100)와 음소 단위 채점**이 필요할 때만 Azure를 켜세요.

1. Azure Portal → **Speech** 리소스 생성 → **Keys and Endpoint**에서 키/리전 확인
2. 앱 **Settings → Azure pronunciation → Score every turn** 켜기 → 키·리전 입력
   (또는 서버에 `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`)
3. 이후 모든 턴에 `Accuracy / Fluency / Completeness / Prosody` + 단어·음소 점수가 붙습니다.

**동작 방식**
- iOS Safari는 `audio/mp4`(AAC), Chrome/Android는 `audio/webm`(Opus)로 녹음합니다.
- Azure REST는 **16kHz mono PCM WAV**만 받으므로, Azure가 켜져 있으면 **브라우저에서 직접 WAV로 변환**(Web Audio `decodeAudioData` + 리샘플)한 뒤 업로드합니다. 서버에 ffmpeg가 필요 없습니다.
- 변환에 실패하면 자동으로 원본 오디오 + OpenAI 전용 모드로 폴백합니다(발음 점수만 생략).
- 리전이 `EnableProsodyAssessment`를 지원하지 않으면 프로소디 없이 자동 재시도합니다.

---

## 7. API 라우트

| 라우트 | 입력 | 출력 |
| --- | --- | --- |
| `POST /api/coach` | `multipart/form-data`: `audio`(webm/mp4/wav), `payload`(시나리오·히스토리·모델·voice·speed) | `{ transcript, reply, feedback{natural, pronunciation, intonation, vocabulary}, assessment?, audioBase64 }` — 전사→코칭→TTS를 **한 번에** 처리 |
| `POST /api/pronunciation` | `audio`(16kHz WAV), `text` | Azure `PronunciationAssessment` (단어·음소 포함) — 재채점용 |
| `POST /api/tts` | `{ text, voice, speed, model }` | `{ audioBase64 }` — "Play native model" / 미리듣기 |
| `GET /api/health` | – | 서버 키 존재 여부, 기본 모델 — 설정 화면의 "사용 중" 표시 |

**키 전달 규칙**: 클라이언트 키는 `x-openai-key`, `x-azure-key`, `x-azure-region` 헤더로만 전달되며, 응답은 모두 `Cache-Control: no-store`입니다. 서버는 키를 저장·로깅하지 않습니다.

### 파이프라인 (`/api/coach`)

```
녹음(MediaRecorder)
   └─(Azure ON) Web Audio → 16kHz mono WAV 변환
        ▼
  [1] OpenAI Transcriptions (whisper-1 / gpt-4o-transcribe)
        ▼ transcript
  [2] Chat Completions (gpt-4o, JSON 모드)
        ├─ 대화 답변 + 표현 업그레이드 + 발음/억양 코칭 → 구조화 JSON
        └─ (병렬) Azure 발음 평가 ← transcript를 기준 텍스트로 사용
        ▼
  [3] OpenAI TTS (tts-1 / tts-1-hd) → mp3 base64
        ▼
  한 응답으로 반환 → 자동 재생 + 피드백 카드
```

---

## 8. 폴더 구조

```
english-phone-coach/
├── app/
│   ├── layout.tsx            # 메타데이터 · PWA/iOS 메타 · 뷰포트
│   ├── page.tsx              # <CoachApp />
│   ├── globals.css           # 디자인 토큰 · 컴포넌트 클래스 · 애니메이션
│   └── api/
│       ├── coach/route.ts    # 전사 + 코칭 + TTS (+ Azure)
│       ├── pronunciation/route.ts
│       ├── tts/route.ts
│       └── health/route.ts
├── components/
│   ├── CoachApp.tsx          # 상태 머신·녹음·재생·세션 저장 (핵심)
│   ├── FeedbackCard.tsx      # 점수 타일·단어/음소·표현 교정
│   ├── SettingsSheet.tsx     # BYOK · 모델 · 보이스 · 속도 · Azure
│   ├── ScenarioSheet.tsx     # 시나리오 선택 · 커스텀 주제
│   ├── ReviewSheet.tsx       # 세션 리뷰
│   ├── AudioVisualizer.tsx   # rAF 기반 파형(리렌더 없음)
│   ├── CoachAvatar.tsx · MicButton.tsx · Sheet.tsx · Icons.tsx · types.ts
├── lib/
│   ├── types.ts · scenarios.ts · prompts.ts · settings.ts · format.ts
│   ├── audio.ts              # MIME 자동 선택(iOS mp4 / webm) · 레벨 미터
│   ├── wav.ts                # 16kHz mono WAV 인코딩/리샘플 (Azure용)
│   ├── openai.ts             # 전사 · 코칭 · TTS · JSON 파싱 폴백
│   └── azure.ts              # 발음 평가 REST
├── public/
│   ├── manifest.json
│   └── icons/ (180 · 192 · 512 · 1024)
├── .env.example · .gitignore · README.md
├── next.config.mjs · tailwind.config.ts · postcss.config.mjs · tsconfig.json
```

---

## 9. 비용을 아끼는 팁

- 코칭 품질만 유지하고 싶다면 **`gpt-4o-mini` + `tts-1`** 조합이 가장 저렴합니다.
- `tts-1-hd`/`gpt-4o-mini-tts`는 발음 모델을 들을 때만 켜세요(설정에서 즉시 변경 가능).
- 발음 **점수**가 필요 없는 날은 Azure를 꺼 두면 턴당 요청이 1회 줄어듭니다.
- 녹음은 최대 2분에서 자동 종료되며, 45초 이내 문장이면 충분합니다.

---

## 10. 트러블슈팅

| 증상 | 원인 / 해결 |
| --- | --- |
| "This browser can't record audio" | HTTPS/localhost가 아님, 또는 구형 브라우저. `https://` Vercel 주소 사용 |
| 마이크 권한 창이 안 뜸 | iOS는 사용자 제스처에서만 권한을 요청합니다. 버튼을 직접 탭했는지 확인. Safari `aA → 웹사이트 설정`에서 재설정 |
| 코치 음성이 안 들림 | iOS 자동재생 차단. 말풍선의 **Tap to hear** 탭. 설정에서 Auto-play 확인 |
| "No OpenAI API key yet" | `.env.local`/Vercel 환경변수 또는 Settings의 키 입력. 헬스 표시가 "서버 키 감지"인지 확인 |
| 401 / invalid key | 키 오타·만료·권한(모델 접근) 확인. 새 키는 결제/쿼터 설정 필요 |
| 발음 점수가 안 붙음 | Azure 토글이 꺼져 있거나, 이 턴이 WAV 변환에 실패(경고 토스트). Re-score 시도 |
| 업로드 실패(413) | Vercel 요청 본문 4.5MB 제한. 2분 제한 이내면 보통 문제없음. 아주 긴 녹음은 나눠 말하기 |
| 한국어 억양이 섞임 | 시나리오를 **Shadowing**으로 두고 모델 문장을 그대로 따라 말하면 교정이 가장 선명합니다 |

---

## 11. 보안 · 개인정보

- 저장소에는 **어떤 키도 포함되지 않습니다**(`.gitignore`가 `.env*` 차단, `.env.example`은 빈 값).
- BYOK 키는 **브라우저 localStorage**에만 저장됩니다 → 그 기기를 쓰는 사람은 키를 볼 수 있으므로, 공용 기기에서는 서버 키 + 접근 제어를 권장합니다.
- 서버 키는 요청 처리 중에만 메모리에서 사용되며 로그에 남기지 않습니다.
- 대화 기록은 **오디오를 제외하고** localStorage에 저장됩니다. 민감한 내용은 **Clear conversation history**로 삭제하세요.
- 오디오는 코칭을 위해 OpenAI(전사·TTS) 및 설정 시 Azure(발음 평가)로 전송됩니다.

---

## 12. 검증 결과

```
$ npx tsc --noEmit      →  오류 0
$ npm run build         →  ✓ Compiled successfully
                            Route (app)
                            ○ /
                            ƒ /api/coach  /api/health  /api/pronunciation  /api/tts
```

브라우저(390×844 iPhone 뷰포트)에서 확인한 항목: 통화 화면 렌더, 시나리오/설정/리뷰 시트, 세션 복원, 단어별 점수→음소 펼침, 콘솔 에러 0건.

---

© Echo — personal use. OpenAI · Azure 약관을 따릅니다.
