# Voice Mode for Claude Code

Voice Mode for Claude Code allows you to have a continuous two-way conversation with Claude Code, hands-free.

It uses the new [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to deliver voice input to Claude while it works.

This lets you speak continuously to Claude - interrupt, redirect, or provide feedback without stopping what Claude is doing.

Optionally enable text-to-speech to have Claude speak back to you.

Voice recognition and text-to-speech are handled by the browser, so there is nothing to download, and no API keys are needed.

## Demo Video

[![Demo Video](https://img.youtube.com/vi/GbDatJtm8_k/0.jpg)](https://youtu.be/GbDatJtm8_k)

## Installation

Installation is easy.

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

The browser interface will automatically open after 3 seconds (<http://localhost:5111>).

Click "Start Listening"

### 3. Speak

Say something to Claude. You will need to send one message in the Claude Code CLI to start the conversation.

### 4. Trigger Word Mode (Optional)

By default, utterances are sent automatically when you pause. You can switch to "Wait for Trigger Word" mode in the browser interface:

1. Toggle to "Wait for Trigger Word" mode
2. Enter a trigger word (e.g., "send", "claude", "go")
3. Speak your message(s) - they will queue up in the browser
4. Say your trigger word to send all queued messages at once (or click "Send Now")

The trigger word is case-insensitive and will be automatically removed from your message before sending.

### 5. Push-to-Talk Mode (Optional)

For hands-free operation with precise control, use Push-to-Talk mode:

1. Select "Push-to-talk" mode in the browser interface
2. Configure your preferred key (default: Ctrl+Space)
3. Hold the key to record, release to send
4. Or hold the microphone button to record

**Features:**
- Configurable keybinding (any key or key combination like Ctrl+Space)
- Visual feedback showing recording state
- Automatic discard of accidental short recordings (<300ms)
- Support for external PTT triggers via API

#### Global PTT Hotkey (Works even when browser is not focused)

By default, PTT keyboard shortcuts only work when the browser tab is active. To use PTT with global hotkeys that work even when the browser is minimized or in the background, run the PTT helper in a separate terminal:

```bash
# Start the PTT helper with default key (Ctrl+Space)
npx mcp-voice-hooks ptt-helper

# Or specify a custom key combination
npx mcp-voice-hooks ptt-helper --key "Alt+Space"
npx mcp-voice-hooks ptt-helper --key "F8"
npx mcp-voice-hooks ptt-helper --key "Ctrl+Shift+R"
```

The PTT helper runs as a standalone process that listens for global keyboard events and sends commands to the mcp-voice-hooks server. Make sure PTT mode is enabled in the browser interface before starting the helper.

**Auto-start PTT Helper with MCP Server:**

You can configure the PTT helper to start automatically with the MCP server by adding environment variables to your `.claude/settings.local.json`:

```json
{
  "env": {
    "MCP_VOICE_HOOKS_PTT": "true",
    "MCP_VOICE_HOOKS_PTT_KEY": "F8"
  }
}
```

Or pass CLI arguments when running manually:
```bash
npx mcp-voice-hooks --ptt --ptt-key "F8"
```

**Platform Support:**
- **Windows**: Full support via native keyboard hook binary
- **Mac/Linux**: Not yet supported (browser-based PTT works when tab is focused)

**First-time Setup (Windows):**
The PTT helper requires a native binary. If not already compiled, you can build it:
```bash
cd resources
gcc -O2 windows-key-listener.c -o bin/windows-key-listener.exe -luser32
```
Requires MinGW or similar GCC toolchain. Pre-built binaries may be available in releases.

## Browser Compatibility

- ✅ **Chrome**: Full support for speech recognition, browser text-to-speech, and system text-to-speech
- ⚠️ **Safari**: Full support for speech recognition and system text-to-speech, but browser text-to-speech cannot load high-quality voices
- ❌ **Edge**: Speech recognition not working on Apple Silicon (language-not-supported error)

## Voice responses

There are two options for voice responses:

1. Browser Text-to-Speech
2. System Text-to-Speech

### Selecting and downloading high quality System Voices (Mac only)

Mac has built-in text to speech, but high quality voices are not available by default.

You can download high quality voices from the system voice menu: `System Settings > Accessibility > Spoken Content > System Voice`

Click the info icon next to the system voice dropdown. Search for "Siri" to find the highest quality voices. You'll have to trigger a download of the voice.

Once it's downloaded, you can select it in the Browser Voice (Local) menu in Chrome.

Test it with the bash command:

```bash
say "Hi, this is your Mac system voice"
```

To use Siri voices with voice-hooks, you need to set your system voice and select "Mac System Voice" in the voice-hooks browser interface.

Other downloaded voices will show up in the voice dropdown in the voice-hooks browser interface so you can select them there directly, instead of using the "Mac System Voice" option.

There is a bug in Safari that prevents browser text-to-speech from loading high-quality voices after browser restart. This is a Safari Web Speech API limitation. To use high-quality voices in Safari you need to set your system voice to Siri and select "Mac System Voice" in the voice-hooks browser interface.

## Manual Hook Installation

The hooks are automatically installed/updated when the MCP server starts. However, if you need to manually install or reconfigure the hooks:

```bash
npx mcp-voice-hooks install-hooks
```

This will configure your project's `.claude/settings.local.json` with the necessary hook commands.

## Uninstallation

To completely remove MCP Voice Hooks:

```bash
# Remove from Claude MCP servers
claude mcp remove voice-hooks
```

```bash
# Also remove hooks and settings
npx mcp-voice-hooks uninstall
```

This will:

- Clean up voice hooks from your project's `.claude/settings.local.json`
- Preserve any custom hooks you've added

## Configuration

#### Port Configuration

The default port is 5111. To use a different port, set the `MCP_VOICE_HOOKS_PORT` environment variable in your project's `.claude/settings.local.json`:

```json
{
  "env": {
    "MCP_VOICE_HOOKS_PORT": "8080"
  }
}
```

This environment variable is used by both:

- The MCP server to determine which port to listen on
- The Claude Code hooks to connect to the correct port

**Note**: Setting this in `.claude/settings.local.json` is the recommended approach. The environment variable will be available to both the MCP server process and the hook commands.

#### Browser Auto-Open

When running in MCP-managed mode, the browser will automatically open if no frontend connects within 3 seconds. To disable this behavior:

```json
{
  "env": {
    "MCP_VOICE_HOOKS_AUTO_OPEN_BROWSER": "false"
  }
}
```

## Experimental: Alternate Installation Method - Plugin mode

Simply add the following to your project's `.claude/settings.local.json` and restart Claude Code:

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

set `enabled` to `false` if you want to temporarily disable the plugin.

## Development & Building

### Building from Source

See [docs/BUILDING.md](docs/BUILDING.md) for comprehensive build instructions.

Quick start:
```bash
git clone https://github.com/johnmatthewtennant/mcp-voice-hooks.git
cd mcp-voice-hooks
npm install
npm run build          # Cleans cache and builds MCP server
```

**Important:** The `npm run build` command automatically cleans the cache before building. If you experience issues with stale code, you can also run `npm run clean` manually to remove the `dist` directory.

### Documentation

- **Building**: [docs/BUILDING.md](docs/BUILDING.md) - Build instructions
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md) - Development workflow

## License

UNLICENSED
