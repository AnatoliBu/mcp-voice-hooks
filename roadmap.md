# MCP Voice Hooks - Roadmap

## Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser UI    │    │ Unified Server  │    │  Claude Code    │
│                 │    │                 │    │                 │
│ • Voice Input   │◄──►│ • HTTP Server   │    │ • MCP Client    │
│ • TTS Playback  │    │ • Utterance Q   │◄──►│ • Tool Calls    │
│ • Settings      │    │ • Hook APIs     │    │ • Stop Hook     │
│ • PTT Controls  │    │ • SSE Events    │    │ • Pre-Speak Hook│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Open Tasks

### Bug Fixes & Polish

- [ ] Add a note to the pre-speak hook that the voice response was not delivered because the assistant needs to read the new utterances first
- [ ] Remove mocking from tests as much as possible — too many mocks with duplicate logic

### UI/UX

- [ ] Add ability to delete pending messages in messenger UI
- [ ] Countdown timer on the frontend when Claude is waiting
- [ ] Configurable timeout on the frontend
  - [ ] Determine max timeout allowed by Claude Code
  - [ ] Read timeout from Claude Code settings
- [ ] UI toggle to enable/disable notification sound when Claude is waiting
- [ ] Handle multiple instances on same machine (dynamic port allocation or per-project config)
- [ ] Investigate showing/hiding MCP tools live without restarting Claude Code

### MCP Tools

- [ ] Add MCP tool to view conversation history (not just pending messages)

### Hooks

- [ ] Consider using `suppressOutput` for hooks (stop hook, pre-speak hook)

### OpenAI Integration (Enhanced Mobile Support)

- [ ] OpenAI API key configuration (env var + UI field)
- [ ] OpenAI Whisper speech-to-text with browser fallback
- [ ] OpenAI TTS voices (alloy, echo, fable, onyx, nova, shimmer) in voice dropdown

### Infrastructure

- [ ] Set up automated publishing workflow (GitHub Actions)
- [ ] Test npx integration across different environments
