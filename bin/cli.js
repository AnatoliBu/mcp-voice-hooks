#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { replaceVoiceHooks, areHooksEqual, removeVoiceHooks } from '../dist/hook-merger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main entry point for npx mcp-voice-hooks
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === '--version' || command === '-v') {
      // Read package.json to get version
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log(packageJson.version);
    } else if (command === 'install-hooks') {
      console.log('🔧 Installing MCP Voice Hooks...');

      // Configure Claude Code settings automatically
      await configureClaudeCodeSettings();

      console.log('\n✅ Installation complete!');
      console.log('📝 To add the MCP server to Claude Code, run one of:');
      console.log('   Local:  claude mcp add voice-hooks node bin/cli.js');
      console.log('   NPM:    claude mcp add voice-hooks npx mcp-voice-hooks@latest');
    } else if (command === 'uninstall') {
      console.log('🗑️  Uninstalling MCP Voice Hooks...');
      await uninstall();
    } else if (command === 'ptt-helper') {
      // Run the PTT helper script with remaining arguments
      await runPTTHelper(args.slice(1));
    } else {
      // Default behavior: ensure hooks are installed/updated, then run the MCP server
      console.log('🎤 MCP Voice Hooks - Starting server...');

      // Skip hook installation if --skip-hooks flag is present (used by plugin mode)
      const skipHooks = args.includes('--skip-hooks');
      if (!skipHooks) {
        // Auto-install/update hooks on every startup
        await ensureHooksInstalled();
      } else {
        console.log('ℹ️  Skipping hook installation (plugin mode)');
      }

      console.log('');
      await runMCPServer();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}


// Automatically configure Claude Code settings
async function configureClaudeCodeSettings() {
  const claudeDir = path.join(process.cwd(), '.claude');
  const settingsPath = path.join(claudeDir, 'settings.local.json');
  // This was used in versions <= v1.0.21.
  const oldSettingsPath = path.join(claudeDir, 'settings.json');

  console.log('⚙️  Configuring project Claude Code settings...');

  // Create .claude directory if it doesn't exist
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
    console.log('✅ Created project .claude directory');
  }

  // Clean up old settings.json if it exists (for users upgrading from older versions)
  if (fs.existsSync(oldSettingsPath)) {
    try {
      console.log('🔄 Found old settings.json, cleaning up voice hooks...');
      const oldSettingsContent = fs.readFileSync(oldSettingsPath, 'utf8');
      const oldSettings = JSON.parse(oldSettingsContent);

      if (oldSettings.hooks) {
        // Remove voice hooks from old settings
        const cleanedHooks = removeVoiceHooks(oldSettings.hooks);

        if (Object.keys(cleanedHooks).length === 0) {
          delete oldSettings.hooks;
        } else {
          oldSettings.hooks = cleanedHooks;
        }

        // Write back cleaned settings
        fs.writeFileSync(oldSettingsPath, JSON.stringify(oldSettings, null, 2));
        console.log('✅ Cleaned up voice hooks from old settings.json');
      }
    } catch (error) {
      console.log('⚠️  Could not clean up old settings.json:', error.message);
    }
  }

  // Read existing settings or create new
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const settingsContent = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(settingsContent);
      console.log('📖 Read existing settings');
    } catch (error) {
      console.log('⚠️  Error reading existing settings, creating new');
      settings = {};
    }
  }

  // Create .claude/hooks directory and copy hook scripts
  const hooksDir = path.join(claudeDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Copy hook scripts from plugin/hooks to project .claude/hooks
  const pluginHooksDir = path.join(__dirname, '..', 'plugin', 'hooks');
  const hookScripts = ['stop-hook.cjs', 'pre-speak-hook.cjs', 'post-tool-hook.cjs'];
  for (const script of hookScripts) {
    const src = path.join(pluginHooksDir, script);
    const dest = path.join(hooksDir, script);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Generate hook configuration with absolute paths (Windows compatible)
  const projectPath = process.cwd().replace(/\\/g, '/');
  const hookConfig = {
    Stop: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: `node "${projectPath}/.claude/hooks/stop-hook.cjs"`
      }]
    }],
    PreToolUse: [{
      matcher: '_voice-hooks__speak$',
      hooks: [{
        type: 'command',
        command: `node "${projectPath}/.claude/hooks/pre-speak-hook.cjs"`
      }]
    }],
    PostToolUse: [{
      matcher: '^(?!.*_voice-hooks__)',
      hooks: [{
        type: 'command',
        command: `node "${projectPath}/.claude/hooks/post-tool-hook.cjs"`
      }]
    }]
  };

  // Replace voice hooks intelligently
  const updatedHooks = replaceVoiceHooks(settings.hooks || {}, hookConfig);

  // Configure PTT environment variables (only on Windows)
  if (process.platform === 'win32') {
    if (!settings.env) {
      settings.env = {};
    }
    // Only set PTT defaults if not already configured
    if (!settings.env.MCP_VOICE_HOOKS_PTT) {
      settings.env.MCP_VOICE_HOOKS_PTT = 'true';
      console.log('✅ Enabled PTT auto-start');
    }
    if (!settings.env.MCP_VOICE_HOOKS_PTT_KEY) {
      settings.env.MCP_VOICE_HOOKS_PTT_KEY = 'F8';
      console.log('✅ Set default PTT key to F8');
    }
  }

  // Check if hooks actually changed (ignoring order)
  const hooksChanged = !areHooksEqual(settings.hooks || {}, updatedHooks);
  const envChanged = process.platform === 'win32' && settings.env &&
    (settings.env.MCP_VOICE_HOOKS_PTT || settings.env.MCP_VOICE_HOOKS_PTT_KEY);

  if (!hooksChanged && !envChanged) {
    console.log('✅ Claude settings already up to date');
    return;
  }

  // Update settings with new hooks
  settings.hooks = updatedHooks;

  // Write settings back
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('✅ Updated project Claude Code settings');
}

// Silent hook installation check - runs on every startup
async function ensureHooksInstalled() {
  try {
    console.log('🔄 Updating hooks to latest version...');

    // Update hooks configuration in settings.json
    await configureClaudeCodeSettings();
    console.log('✅ Hooks and settings updated');
  } catch (error) {
    // Silently continue if hooks can't be updated
    console.warn('⚠️  Could not auto-update hooks:', error.message);
  }
}

// Run the PTT helper
async function runPTTHelper(helperArgs) {
  const pttHelperPath = path.join(__dirname, 'ptt-helper.js');

  const child = spawn('node', [pttHelperPath, ...helperArgs], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start PTT helper:', error.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

// Get CLI argument value
function getArgValue(args, names) {
  for (let i = 0; i < args.length; i++) {
    if (names.includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('-')) {
      return args[i + 1];
    }
  }
  return null;
}

// Run the MCP server
async function runMCPServer() {
  const serverPath = path.join(__dirname, '..', 'dist', 'unified-server.js');
  const pttHelperPath = path.join(__dirname, 'ptt-helper.js');

  // Build server arguments
  const serverArgs = ['--mcp-managed'];
  const args = process.argv.slice(2);
  if (args.includes('--debug') || args.includes('-d')) {
    serverArgs.push('--debug');
  }

  // Pass legacy UI flag to server via environment variable
  if (args.includes('--legacy-ui')) {
    process.env.MCP_VOICE_HOOKS_LEGACY_UI = 'true';
  }

  // Check if PTT helper should be started
  const enablePTT = args.includes('--ptt') || process.env.MCP_VOICE_HOOKS_PTT === 'true';
  const pttKey = getArgValue(args, ['--ptt-key']) || process.env.MCP_VOICE_HOOKS_PTT_KEY || 'Ctrl+Space';

  let pttChild = null;

  // Run the compiled JavaScript server
  const child = spawn('node', [serverPath, ...serverArgs], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start MCP server:', error.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log(`🔄 MCP server exited with code ${code}`);
    if (pttChild) {
      pttChild.kill();
    }
    process.exit(code);
  });

  // Start PTT helper if enabled (with delay to let server start first)
  if (enablePTT && process.platform === 'win32') {
    setTimeout(() => {
      console.log(`🎤 Starting PTT helper with key: ${pttKey}`);
      pttChild = spawn('node', [pttHelperPath, '--key', pttKey], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      pttChild.on('error', (error) => {
        console.error('⚠️  PTT helper failed to start:', error.message);
      });

      pttChild.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.log(`⚠️  PTT helper exited with code ${code}`);
        }
        pttChild = null;
      });
    }, 2000); // Wait 2 seconds for server to start
  } else if (enablePTT && process.platform !== 'win32') {
    console.log('⚠️  PTT helper is only supported on Windows');
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (pttChild) {
      pttChild.kill('SIGINT');
    }
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    if (pttChild) {
      pttChild.kill('SIGTERM');
    }
    child.kill('SIGTERM');
  });
}

// Uninstall MCP Voice Hooks
async function uninstall() {
  const claudeDir = path.join(process.cwd(), '.claude');
  const settingsLocalPath = path.join(claudeDir, 'settings.local.json');
  const settingsPath = path.join(claudeDir, 'settings.json');

  // Helper function to remove hooks from a settings file
  async function removeHooksFromFile(filePath, fileName) {
    if (fs.existsSync(filePath)) {
      try {
        console.log(`⚙️  Removing voice hooks from ${fileName}...`);

        const settingsContent = fs.readFileSync(filePath, 'utf8');
        const settings = JSON.parse(settingsContent);

        if (settings.hooks) {
          // Remove voice hooks
          const cleanedHooks = removeVoiceHooks(settings.hooks);

          if (Object.keys(cleanedHooks).length === 0) {
            // If no hooks remain, remove the hooks property entirely
            delete settings.hooks;
          } else {
            settings.hooks = cleanedHooks;
          }

          // Write updated settings
          fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
          console.log(`✅ Removed voice hooks from ${fileName}`);
        } else {
          console.log(`ℹ️  No hooks found in ${fileName}`);
        }
      } catch (error) {
        console.log(`⚠️  Could not update ${fileName}:`, error.message);
      }
    }
  }

  // Remove hooks from both settings.local.json and settings.json (for backwards compatibility)
  await removeHooksFromFile(settingsLocalPath, 'settings.local.json');
  await removeHooksFromFile(settingsPath, 'settings.json');

  if (!fs.existsSync(settingsLocalPath) && !fs.existsSync(settingsPath)) {
    console.log('ℹ️  No Claude settings files found in current project');
  }

  console.log('\n✅ Uninstallation complete!');
  console.log('👋 MCP Voice Hooks has been removed.');
}

// Run the main function
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});