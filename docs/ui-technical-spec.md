# Voice Mode for Claude Code — Technical Specification

## Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Browser UI        │    │   Unified Server     │    │   Claude Code       │
│   (index.html +     │◄──►│   (Express HTTP +    │◄──►│   (MCP Client +     │
│    app.js)          │SSE │    MCP Server)       │stdio│    Hook System)     │
│                     │HTTP│                      │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

- **Browser UI**: Single-page app, vanilla HTML/JS/CSS, no build step
- **Server**: TypeScript, Express HTTP + MCP SDK, port 5111
- **Integration**: Claude Code hooks (stop, pre-speak, post-tool) + MCP tool (speak)

---

## Backend — HTTP API Endpoints

### Utterance Management

| Method | Path | Request Body | Response | Purpose |
|--------|------|-------------|----------|---------|
| `POST` | `/api/potential-utterances` | `{text, timestamp?}` | `{success, utterance: {id, text, timestamp, status}}` | Add user message to queue |
| `GET` | `/api/utterances` | Query: `limit?=10` | `{utterances: [...]}` | Get recent utterances |
| `GET` | `/api/utterances/status` | — | `{total, pending, delivered}` | Queue statistics |
| `GET` | `/api/conversation` | Query: `limit?=50` | `{messages: [{id, role, text, timestamp, status?}]}` | Full conversation history (user + assistant) |
| `DELETE` | `/api/utterances/:id` | — | `{success, message}` | Delete specific pending message |
| `DELETE` | `/api/utterances` | — | `{success, clearedCount}` | Clear all utterances |

### Dequeue & Wait

| Method | Path | Request Body | Response | Purpose |
|--------|------|-------------|----------|---------|
| `POST` | `/api/dequeue-utterances` | — | `{success, utterances: [...]}` | Dequeue pending → delivered |
| `POST` | `/api/wait-for-utterances` | — | `{success, utterances, waitTime}` | Poll with configurable timeout |
| `GET` | `/api/has-pending-utterances` | — | `{hasPending, pendingCount}` | Check for pending |

### Hook Endpoints

| Method | Path | Response | Purpose |
|--------|------|----------|---------|
| `POST` | `/api/hooks/stop` | `{decision: "approve"|"block", reason?}` | Stop hook validation |
| `POST` | `/api/hooks/pre-speak` | `{decision: "approve"|"block", reason?}` | Pre-speak hook (checks pending utterances) |
| `POST` | `/api/hooks/post-tool` | `{decision: "approve"|"block", reason?}` | Post-tool hook |
| `POST` | `/api/validate-action` | `{action: "tool-use"|"stop"}` → `{allowed, requiredAction?, reason?}` | Unified action validation |

### Voice & TTS

| Method | Path | Request Body | Response | Purpose |
|--------|------|-------------|----------|---------|
| `POST` | `/api/speak` | `{text}` | `{success, respondedCount}` | Speak via browser TTS, mark delivered→responded |
| `POST` | `/api/speak-system` | `{text, rate?}` | `{success}` | Mac `say` command (server-side only) |
| `POST` | `/api/voice-preferences` | `{voiceResponsesEnabled}` | `{success, preferences}` | Toggle voice responses |
| `GET` | `/api/voice-input-state` | — | `{voiceInputActive, voiceResponsesEnabled}` | Get voice state |
| `POST` | `/api/voice-input-state` | `{active}` | `{success, voiceInputActive}` | Set mic on/off |
| `GET` | `/api/wait-settings` | — | `{waitForInput, waitTimeout}` | Get wait config |
| `POST` | `/api/wait-settings` | `{waitForInput?, waitTimeout?}` | `{success, ...}` | Set wait config |

### Push-to-Talk

| Method | Path | Request Body | Response | Purpose |
|--------|------|-------------|----------|---------|
| `POST` | `/api/ptt` | `{action: "start"|"stop"}` | `{success, action}` | Trigger PTT via API (for helper script) |

### UI Routing

| Method | Path | Serves |
|--------|------|--------|
| `GET` | `/` | `index.html` (messenger) or `legacy.html` (if `MCP_VOICE_HOOKS_LEGACY_UI=true`) |
| `GET` | `/messenger` | `index.html` |
| `GET` | `/legacy` | `legacy.html` |

---

## Backend — SSE Events

**Endpoint**: `GET /api/tts-events`

| Event Type | Data | Purpose |
|------------|------|---------|
| `connected` | `{type: "connected"}` | Initial handshake |
| `speak` | `{type: "speak", text: string}` | Browser should speak this text |
| `waitStatus` | `{type: "waitStatus", isWaiting: boolean}` | Show/hide "Claude is waiting..." |
| `ptt` | `{type: "ptt", action: "start"|"stop"}` | External PTT trigger |

---

## Backend — MCP Tool

### `speak`
- **Description**: Speak text using text-to-speech and mark delivered utterances as responded
- **Input**: `{text: string}` (required)
- **Behavior**: Sends text to browser via SSE → browser decides voice → marks delivered→responded
- **Fails if**: voice responses disabled, empty text

---

## Backend — Utterance State Machine

```
pending ──(dequeue)──► delivered ──(speak)──► responded
   │                      │
   └──(delete)──► removed └──(clear all)──► removed
```

---

## Backend — Server State

| Variable | Type | Purpose |
|----------|------|---------|
| `queue.utterances` | `Utterance[]` | All utterances with status |
| `queue.messages` | `Message[]` | Full conversation history (user + assistant) |
| `voicePreferences.voiceResponsesEnabled` | `boolean` | TTS on/off |
| `voicePreferences.voiceInputActive` | `boolean` | Mic on/off (synced from browser) |
| `waitSettings.waitForInput` | `boolean` | Auto-wait enabled |
| `waitSettings.waitTimeout` | `number` | Wait timeout seconds (30-600) |
| `lastToolUseTimestamp` | `Date|null` | Last approved tool use |
| `lastSpeakTimestamp` | `Date|null` | Last speak call |
| `lastTimeoutTimestamp` | `Date|null` | Last wait timeout |
| `ttsClients` | `Set<Response>` | Connected SSE clients |

---

## Frontend — UI Structure

### Screens

Only **one screen** — the messenger UI. Two variants served:
- **Messenger** (`index.html`): Chat bubbles, modern UI (default)
- **Legacy** (`legacy.html`): List-based queue view

### Messenger Layout (index.html)

```
┌─────────────────────────────────────────┐
│ Header: "Voice Mode for Claude Code"     │ ← fixed, safe-area-inset-top
│         [Switch to Legacy UI]            │
├─────────────────────────────────────────┤
│                                         │
│ Conversation Container (scrollable)     │ ← flex: 1, touch-scroll
│                                         │
│   [User bubble]          [timestamp]    │ ← blue, right-aligned
│                [Assistant bubble]        │ ← gray, left-aligned
│   [User bubble]          [PENDING] [🗑] │ ← delete on hover
│                                         │
│   ┄┄┄ Claude is waiting... ┄┄┄         │ ← sticky bottom
│                                         │
├─────────────────────────────────────────┤
│ Input Section                           │ ← safe-area-inset-bottom
│ ┌─────────────────────────────────┬───┐ │
│ │ Type a message or use voice...  │🎤 │ │ ← textarea + mic button
│ └─────────────────────────────────┴───┘ │
│ [PTT Status: Hold to talk...]           │ ← conditional
│ ▼ Settings (collapsed by default)       │
│   ┌─────────────────────────────────┐   │
│   │ ○ Auto-send  ○ Trigger  ○ PTT  │   │ ← send mode radios
│   │ [Trigger word input]            │   │ ← conditional
│   │ [PTT keybinding + delays]       │   │ ← conditional
│   │ ☑ Wait for input  Timeout: 60s │   │
│   │ Recognition Language: [en-US ▼] │   │
│   │ Voice Responses [toggle]        │   │
│   │ Voice: [dropdown] Rate: [slider]│   │ ← conditional (if voice on)
│   │ ☑ Pause mic during speech       │   │
│   │ [Test Voice]                    │   │
│   └─────────────────────────────────┘   │
│                  max-height: 50vh, scroll│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Audio Unlock Overlay (modal)            │ ← only if voice enabled
│         🔊 Tap to enable voice          │
└─────────────────────────────────────────┘
```

### Message Bubble Structure

```html
<div class="message-bubble user|assistant" data-message-id="...">
  <div class="message-text">message content</div>
  <div class="message-meta">
    <span class="message-timestamp">12:34:56</span>
    <div class="message-status pending|delivered|responded">  <!-- user only -->
      <span class="delete-message-btn">🗑</span>             <!-- pending only -->
      <span>PENDING</span>
    </div>
  </div>
</div>
```

---

## Frontend — State (MessengerClient)

### Core State
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `sendMode` | `string` | `'automatic'` | `'automatic'`/`'trigger'`/`'ptt'` |
| `triggerWord` | `string` | `'send'` | Trigger word for trigger mode |
| `isListening` | `boolean` | `false` | Speech recognition active |
| `isInterimText` | `boolean` | `false` | Currently showing interim results |
| `accumulatedText` | `string` | `''` | Accumulated text in trigger mode |
| `sttLanguage` | `string` | `'en-US'` | Speech recognition language |
| `isMobile` | `boolean` | detected | `/iPhone|iPad|iPod|Android/i` |

### TTS State
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `voices` | `SpeechSynthesisVoice[]` | `[]` | Available browser voices |
| `selectedVoice` | `string` | first browser voice | `'system'` or `'browser:N'` |
| `speechRate` | `number` | `1.0` | TTS rate (0.5-5.0) |
| `pauseMicDuringTTS` | `boolean` | `!isMobile` | Pause mic during playback |
| `isPausedForTTS` | `boolean` | `false` | Currently paused for TTS |
| `audioUnlocked` | `boolean` | `false` | Browser audio context unlocked |

### PTT State
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `pttKey` | `string` | `'Ctrl+Space'` | Key combo for PTT |
| `isPTTActive` | `boolean` | `false` | PTT recording active |
| `isPTTStopping` | `boolean` | `false` | Race condition guard |
| `pttMinDuration` | `number` | `300` | Min recording (ms) |
| `pttToggleMode` | `boolean` | `false` | Toggle vs hold |
| `pttStartDelay` | `number` | `100` | Delay before recognition (ms) |
| `pttStopDelay` | `number` | `500` | Delay before stop (ms) |

### Dedup State
| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `lastSentText` | `string` | `''` | Last sent message text |
| `lastSentTime` | `number` | `0` | Timestamp of last send |
| `lastProcessedResultIndex` | `number` | `-1` | Last processed speech result index |

---

## Frontend — localStorage Keys

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `voiceHooksDebug` | `boolean` | `false` | Debug logging |
| `voiceResponsesEnabled` | `boolean` | `false` | TTS on/off |
| `sttLanguage` | `string` | `'en-US'` | Recognition language |
| `ttsLanguageFilter` | `string` | `'all'` | Voice language filter |
| `selectedVoice` | `string` | (auto) | Selected voice |
| `speechRate` | `string` | `'1'` | Speech rate |
| `pauseMicDuringTTS` | `boolean` | platform-dependent | Pause mic during TTS |
| `sendMode` | `string` | `'automatic'` | Send mode |
| `triggerWord` | `string` | `'send'` | Trigger word |
| `pttKey` | `string` | `'Ctrl+Space'` | PTT keybinding |
| `pttToggleMode` | `boolean` | `false` | Toggle mode |
| `pttStartDelay` | `string` | `'100'` | PTT start delay |
| `pttStopDelay` | `string` | `'500'` | PTT stop delay |
| `waitForInput` | `boolean` | `true` | Wait toggle |
| `waitTimeout` | `string` | `'60'` | Wait timeout |

---

## Frontend — CSS Breakpoints

| Breakpoint | Target |
|------------|--------|
| `> 768px` | Desktop/tablet — default styles |
| `≤ 768px` | Mobile — stacked send mode, smaller bubbles (85%), 16px input font |
| `≤ 480px` | Small mobile — minimal padding, 90% bubbles, 13px controls |

### Mobile-Specific CSS Features
- `viewport-fit=cover` + `env(safe-area-inset-*)` for iPhone notch
- `100dvh` + `var(--app-height)` via `visualViewport` API
- `-webkit-overflow-scrolling: touch` + `overscroll-behavior-y: contain`
- `touch-action: manipulation` on interactive elements
- `-webkit-tap-highlight-color: transparent`
- `font-size: 16px` on inputs (prevents iOS zoom)

---

## Frontend — Key Flows

### Voice Input Flow
```
User speaks → Web Speech API onresult (isFinal)
  → automatic mode: sendMessage(transcript) → POST /api/potential-utterances
  → trigger mode: accumulate until trigger word → sendMessage(accumulated)
  → PTT mode: record while held → send on release
```

### TTS Flow
```
Claude calls speak tool → MCP → POST /api/speak
  → Server marks delivered→responded
  → SSE event {type: "speak", text} → Browser
  → Browser: speakText(text)
    → system voice? → POST /api/speak-system (Mac say)
    → browser voice? → speechSynthesis.speak(utterance)
```

### Hook Flow
```
Claude tries to stop → Stop hook → POST /api/hooks/stop
  → Server checks: pending? unresponded? voice active? timeout?
  → approve or block with reason

Claude uses speak tool → Pre-speak hook → POST /api/hooks/pre-speak
  → Server checks: pending utterances? must dequeue first
  → approve or block

After any tool → Post-tool hook → POST /api/hooks/post-tool
  → Server provides voice input status + reminders
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MCP_VOICE_HOOKS_PORT` | `5111` | HTTP server port |
| `MCP_VOICE_HOOKS_LEGACY_UI` | `false` | Use legacy UI as default |
| `MCP_VOICE_HOOKS_AUTO_OPEN_BROWSER` | `true` | Auto-open browser on start |
| `MCP_VOICE_HOOKS_PTT` | `false` | Auto-start PTT helper |
| `MCP_VOICE_HOOKS_PTT_KEY` | — | PTT helper key combo |

---

## Known Limitations

1. **Mac System Voice on mobile**: `say` command runs on server only — doesn't produce audio on iPhone
2. **Safari Private Browsing**: localStorage cleared on tab close — all settings lost
3. **Safari high-quality voices**: Cannot load via Web Speech API after restart
4. **Edge speech recognition**: Not working on Apple Silicon (language-not-supported)
5. **Mobile mic resume after TTS**: Unreliable on Safari — default `pauseMicDuringTTS=false` on mobile
6. **Single instance**: No support for multiple instances on same machine (same port)
