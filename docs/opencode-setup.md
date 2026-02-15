# Voice Hooks for OpenCode

Guide for integrating mcp-voice-hooks with [OpenCode](https://opencode.ai).

## Quick Setup

### 1. Add MCP server to `opencode.jsonc`

Add the `mcp` section to your project's `opencode.jsonc`:

```jsonc
{
  // ... your existing config ...
  "mcp": {
    "voice-hooks": {
      "type": "local",
      "command": ["npx", "mcp-voice-hooks@latest"],
      "enabled": true,
      "environment": {
        "MCP_VOICE_HOOKS_PORT": "5111",
        "MCP_VOICE_HOOKS_AUTO_OPEN_BROWSER": "false"
      }
    }
  }
}
```

### 2. Install the plugin

Create the plugins directory and copy the plugin file:

```bash
mkdir -p .opencode/plugins
```

Create `.opencode/plugins/voice-hooks.js` with the following content:

```javascript
const PORT = process.env.MCP_VOICE_HOOKS_PORT || '5111';
const BASE_URL = `http://localhost:${PORT}`;

async function postHook(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch {
    return { decision: 'approve' };
  }
}

function isSpeakTool(toolName) {
  return toolName.includes('speak');
}

let lastSessionID = null;

export const VoiceHooksPlugin = async ({ client }) => {
  return {
    'tool.execute.before': async (input, _output) => {
      if (isSpeakTool(input.tool)) {
        const result = await postHook('/api/hooks/pre-speak');
        if (result.decision === 'block') {
          throw new Error(result.reason || 'Blocked by voice-hooks: pending utterances');
        }
      }
      if (input.sessionID) lastSessionID = input.sessionID;
    },

    'tool.execute.after': async (input, _output) => {
      if (input.sessionID) lastSessionID = input.sessionID;
    },

    event: async ({ event }) => {
      if (event.type !== 'session.idle') return;
      const result = await postHook('/api/hooks/stop');
      if (result.decision === 'block' && result.reason && lastSessionID) {
        try {
          await client.session.prompt({
            path: { id: lastSessionID },
            body: {
              parts: [{ type: 'text', text: result.reason }],
            },
          });
        } catch {}
      }
    },
  };
};
```

### 3. Start OpenCode

```bash
opencode
```

The browser interface will open automatically at http://localhost:5111. Click "Start Listening" to begin.

## How It Works

The plugin implements two hooks that mirror Claude Code's hook system:

| OpenCode Hook | Claude Code Equivalent | Behavior |
|---|---|---|
| `tool.execute.before` | PreToolUse (pre-speak) | Blocks `speak` tool if pending utterances exist |
| `event` (session.idle) | Stop hook | Re-prompts session if voice input is waiting |

**Note:** The post-tool hook (tool use timestamp tracking) is intentionally omitted. In Claude Code, it enforces "must speak after tools" via a blocking stop hook. OpenCode's `session.idle` cannot block, so tracking tool timestamps would cause an infinite re-prompt loop.

### Key Difference from Claude Code

OpenCode cannot block session stop the way Claude Code's Stop hook does. Instead, when `session.idle` fires and the voice-hooks server reports pending input, the plugin calls `client.session.prompt()` to send a follow-up message that continues the conversation.

## Uninstallation

1. Remove the `mcp.voice-hooks` section from `opencode.jsonc`
2. Delete `.opencode/plugins/voice-hooks.js`

## Configuration

### Browser Auto-Open

Auto-open is disabled by default in the config above (`MCP_VOICE_HOOKS_AUTO_OPEN_BROWSER: "false"`). To open the browser manually, navigate to http://localhost:5111. Set to `"true"` to restore auto-open behavior.

### Custom Port

Change the port in `opencode.jsonc`:

```jsonc
"environment": {
  "MCP_VOICE_HOOKS_PORT": "8080"
}
```

### Voice Responses

Voice responses are configured in the browser interface at http://localhost:5111. See the main [README](../README.md) for voice configuration details.
