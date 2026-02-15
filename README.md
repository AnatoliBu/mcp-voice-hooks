# Voice Mode for Claude Code

Voice Mode for Claude Code allows you to have a continuous two-way conversation with Claude Code, hands-free.

It uses [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to deliver voice input to Claude while it works — you can speak continuously, interrupt, redirect, or provide feedback without stopping what Claude is doing.

Optionally enable text-to-speech to have Claude speak back to you.

Voice recognition and text-to-speech are handled by the browser — nothing to download, no API keys needed.

## Demo Video

[![Demo Video](https://img.youtube.com/vi/GbDatJtm8_k/0.jpg)](https://youtu.be/GbDatJtm8_k)

## Installation

Instructions below are for Claude Code. For **OpenCode**, see [docs/opencode-setup.md](docs/opencode-setup.md).

### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Install Voice Mode

```bash
npx mcp-voice-hooks@latest install-hooks
claude mcp add voice-hooks npx mcp-voice-hooks@latest
```

## Usage

### 1. Start Claude Code

```bash
claude
```

### 2. Start Listening

The browser interface opens automatically after 3 seconds at <http://localhost:5111>.

Click **Start Listening**.

### 3. Speak

Say something to Claude. You'll need to send one message in the Claude Code CLI to start the conversation.

### Voice Input Modes

**Auto-send (default)** — utterances are sent automatically when you pause speaking.

**Trigger Word** — messages queue up until you say a trigger word (e.g. "send", "claude"):

1. Toggle to "Wait for Trigger Word" mode
2. Enter a trigger word
3. Speak your messages — they queue in the browser
4. Say the trigger word to send all at once (or click "Send Now")

**Push-to-Talk** — hold a key to record, release to send:

1. Select "Push-to-talk" mode
2. Configure your preferred key (default: Ctrl+Space)
3. Hold the key to record, release to send

Features: configurable keybinding, visual recording feedback, auto-discard of short recordings (<300ms).

#### Global PTT Hotkey (Windows only)

Browser-based PTT only works when the tab is focused. For global hotkeys, run the PTT helper in a separate terminal:

```bash
npx mcp-voice-hooks ptt-helper
npx mcp-voice-hooks ptt-helper --key "F8"
npx mcp-voice-hooks ptt-helper --key "Alt+Space"
```

Auto-start with MCP server via `.claude/settings.local.json`:

```json
{
  "env": {
    "MCP_VOICE_HOOKS_PTT": "true",
    "MCP_VOICE_HOOKS_PTT_KEY": "F8"
  }
}
```

## Voice Responses

Two options:

1. **Browser Text-to-Speech** — uses Web Speech API, works cross-platform
2. **System Text-to-Speech** — uses macOS `say` command (Mac only)

### High-Quality System Voices (Mac)

Mac has built-in TTS, but high-quality voices need to be downloaded:

1. Go to `System Settings > Accessibility > Spoken Content > System Voice`
2. Click the info icon, search for "Siri", download a voice
3. Select "Mac System Voice" in the voice-hooks browser interface

Other downloaded voices appear directly in the voice dropdown.

## Browser Compatibility

- **Chrome** — full support
- **Safari** — full support, but browser TTS cannot load high-quality voices (use System Voice instead)
- **Edge** — speech recognition not working on Apple Silicon

## Configuration

### Port

Default port is 5111. To change:

```json
{
  "env": {
    "MCP_VOICE_HOOKS_PORT": "8080"
  }
}
```

### Browser Auto-Open

Disable automatic browser opening:

```json
{
  "env": {
    "MCP_VOICE_HOOKS_AUTO_OPEN_BROWSER": "false"
  }
}
```

### Multiple Instances

If another instance is already running on the same port, the second instance will log a message and continue MCP operation through the existing server. The browser UI is served by the first instance.

## Plugin Mode (Experimental)

Add to `.claude/settings.local.json`:

```json
{
  "extraKnownMarketplaces": {
    "mcp-voice-hooks-marketplace": {
      "source": {
        "source": "git",
        "url": "https://github.com/johnmatthewtennant/mcp-voice-hooks.git"
      }
    }
  },
  "enabledPlugins": {
    "mcp-voice-hooks-plugin@mcp-voice-hooks-marketplace": true
  }
}
```

## Uninstallation

```bash
claude mcp remove voice-hooks
npx mcp-voice-hooks uninstall
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for local development workflow and [docs/BUILDING.md](docs/BUILDING.md) for build instructions.

## License

UNLICENSED
