# Building MCP Voice Hooks

Quick guide for building the MCP server locally.

## Prerequisites

- **Node.js** 20+ and npm
- **Git** (for version control)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/johnmatthewtennant/mcp-voice-hooks.git
cd mcp-voice-hooks
npm install

# 2. Build MCP server (clean + build)
npm run build
```

**Important:** `npm run build` automatically cleans the cache before building. This prevents issues with stale code.

## Local Development Workflow

### First-time setup

```bash
npm install            # Install dependencies
npm run build          # Clean + compile TypeScript to dist/
npm install -g .       # Create global symlink (one time only)
```

`npm install -g .` creates a symlink so that `npx mcp-voice-hooks` points to your local `dist/` folder. You only need to run it **once** (or again if `package.json` bin entries or dependencies change).

### After changing code

```bash
npm run build          # Clean + rebuild (that's it!)
```

Since the global symlink already points to your local `dist/`, rebuilt code is picked up immediately. No need to reinstall.

### What each command does

| Command | What it does |
|---------|-------------|
| `npm run clean` | Removes `dist/` directory |
| `npm run build` | Runs `clean` + `tsup` (compiles TypeScript → `dist/`) |
| `npm install -g .` | Creates global symlink to this folder (one-time setup) |

### What needs rebuilding and what doesn't

| What changed | What to do |
|---|---|
| Any `.ts` file in `src/` | `npm run build` |
| `bin/cli.js` or `bin/ptt-helper.js` | Nothing (executed directly via symlink) |
| Files in `public/` (HTML, JS, CSS) | Nothing (served directly, just refresh browser) |
| `package.json` (bin, dependencies) | `npm install && npm install -g .` |

## Troubleshooting

### Stale code / Changes not applied

**Problem**: Code changes don't seem to take effect after rebuild

**Solution**: Clean the cache and rebuild:
```bash
npm run build
```

Or manually clean:
```bash
npm run clean
npm run build
```

This removes the `dist` directory before building.

### Node version issues

**Problem**: Build fails with Node errors

**Solution**: Use Node.js 20 or later:
```bash
node --version  # Should be v20.x.x or higher
```

## Support

**Issues**: https://github.com/johnmatthewtennant/mcp-voice-hooks/issues

**Questions**: See README.md or open a GitHub discussion
