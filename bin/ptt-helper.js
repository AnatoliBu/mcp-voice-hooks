#!/usr/bin/env node

/**
 * PTT Helper - Global Push-to-Talk hotkey listener
 *
 * This script runs as a standalone process and uses a native Windows keyboard
 * hook binary to listen for global keyboard events. When the configured PTT
 * key is pressed/released, it sends HTTP requests to the mcp-voice-hooks
 * server to trigger PTT start/stop.
 *
 * Usage:
 *   npx mcp-voice-hooks ptt-helper [--key "Ctrl+Space"] [--port 5111]
 *
 * Options:
 *   --key, -k    PTT key combination (default: "Ctrl+Space")
 *   --port, -p   Server port (default: 5111 or MCP_VOICE_HOOKS_PORT env var)
 *   --help, -h   Show help
 *
 * Note: Currently only supports Windows. Mac/Linux support coming soon.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);

function getArg(names, defaultValue) {
  for (let i = 0; i < args.length; i++) {
    if (names.includes(args[i]) && args[i + 1]) {
      return args[i + 1];
    }
  }
  return defaultValue;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
PTT Helper - Global Push-to-Talk hotkey listener for mcp-voice-hooks

Usage:
  npx mcp-voice-hooks ptt-helper [options]

Options:
  --key, -k    PTT key combination (default: "Ctrl+Space")
               Examples: "Space", "F8", "Ctrl+Space", "Alt+Shift+R"
  --port, -p   Server port (default: 5111 or MCP_VOICE_HOOKS_PORT env var)
  --help, -h   Show this help message

The helper listens for global keyboard events and sends HTTP requests
to the mcp-voice-hooks server when the PTT key is pressed/released.

Make sure the mcp-voice-hooks server is running and PTT mode is enabled
in the browser interface before starting this helper.

Platform Support:
  - Windows: Full support via native keyboard hook
  - Mac/Linux: Not yet supported (contributions welcome!)
`);
  process.exit(0);
}

const pttKey = getArg(['--key', '-k'], 'Ctrl+Space');
const port = getArg(['--port', '-p'], process.env.MCP_VOICE_HOOKS_PORT || '5111');
const serverUrl = `http://localhost:${port}`;

// Check platform
if (process.platform !== 'win32') {
  console.error(`
❌ PTT Helper currently only supports Windows.

On Mac/Linux, you can use the browser-based PTT which works when the
browser tab is focused, or contribute a native implementation!

See: https://github.com/johnmatthewtennant/mcp-voice-hooks
`);
  process.exit(1);
}

// Find the Windows key listener binary
function findKeyListenerBinary() {
  const binaryName = 'windows-key-listener.exe';
  const candidates = [
    path.join(__dirname, '..', 'resources', 'bin', binaryName),
    path.join(__dirname, '..', 'resources', binaryName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

// Send PTT action to server
async function sendPTTAction(action) {
  try {
    const response = await fetch(`${serverUrl}/api/ptt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      console.error(`Failed to send PTT ${action}:`, response.statusText);
    }
  } catch (error) {
    console.error(`Failed to send PTT ${action}:`, error.message);
  }
}

// Check if another PTT helper instance is already running
async function isAlreadyRunning() {
  try {
    const { execSync } = await import('child_process');
    const output = execSync('tasklist /FI "IMAGENAME eq windows-key-listener.exe" /NH /FO CSV', {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    // tasklist returns lines with process info; filter out "INFO: No tasks" messages
    const lines = output.split(/\r?\n/).filter(l => l.includes('windows-key-listener.exe'));
    return lines.length > 0;
  } catch {
    return false;
  }
}

// Main
const binaryPath = findKeyListenerBinary();

if (!binaryPath) {
  console.error(`
❌ Windows key listener binary not found.

The binary needs to be compiled first. Run:
  cd resources && gcc -O2 windows-key-listener.c -o bin/windows-key-listener.exe -luser32

Or download a pre-built binary from the releases page.
`);
  process.exit(1);
}

// Check for already running instance
if (await isAlreadyRunning()) {
  console.log('ℹ️  PTT Helper is already running. Skipping duplicate launch.');
  process.exit(0);
}

console.log(`
🎤 PTT Helper started
   Key: ${pttKey}
   Server: ${serverUrl}
   Binary: ${binaryPath}

Hold ${pttKey} to record, release to send.
Toggle mode can be enabled in the browser interface.
Press Ctrl+C to exit.
`);

let isPTTActive = false;

// Spawn the native key listener
const keyListener = spawn(binaryPath, [pttKey], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});

keyListener.stdout.setEncoding('utf8');
keyListener.stdout.on('data', (chunk) => {
  const lines = chunk.split(/\r?\n/).filter(line => line.trim());

  for (const line of lines) {
    if (line === 'READY') {
      console.log('✅ Key listener ready');
    } else if (line === 'KEY_DOWN') {
      if (!isPTTActive) {
        isPTTActive = true;
        console.log('🔴 PTT START');
        sendPTTAction('start');
      }
    } else if (line === 'KEY_UP') {
      if (isPTTActive) {
        isPTTActive = false;
        console.log('⚪ PTT STOP');
        sendPTTAction('stop');
      }
    }
  }
});

keyListener.stderr.setEncoding('utf8');
keyListener.stderr.on('data', (data) => {
  // Native binary logs info to stderr
  const message = data.trim();
  if (message) {
    console.log(`[native] ${message}`);
  }
});

keyListener.on('error', (error) => {
  console.error('❌ Failed to start key listener:', error.message);
  process.exit(1);
});

keyListener.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ Key listener exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle graceful shutdown
function cleanup() {
  console.log('\n👋 PTT Helper stopping...');
  if (isPTTActive) {
    sendPTTAction('stop');
  }
  keyListener.kill();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
