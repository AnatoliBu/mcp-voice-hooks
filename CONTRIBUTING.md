# Contributing to MCP Voice Hooks

## Local Development

1. Clone and install:
   ```bash
   git clone <repository-url>
   cd mcp-voice-hooks
   npm install
   npm run build
   ```

2. Install hooks and add MCP server to Claude:
   ```bash
   node bin/cli.js install-hooks
   claude mcp add voice-hooks node bin/cli.js
   ```

3. Start developing:
   ```bash
   npm run build  # After changing TypeScript files
   claude         # Restart to test changes
   ```

**Important**: Claude runs compiled JavaScript from `dist/`, not TypeScript source. Run `npm run build` after changing `.ts` files. Browser files (`public/*`) just need Claude restart.

## Alternative: Using npm link

If you prefer using `npx mcp-voice-hooks` locally:

```bash
npm link
npx mcp-voice-hooks install-hooks
claude mcp add voice-hooks npx mcp-voice-hooks
```

## Debug Mode

Enable debug logging to see detailed server output:

```bash
npx mcp-voice-hooks --debug
# or
npx mcp-voice-hooks -d
```

This is useful for troubleshooting issues during development.

## Release

```bash
npm run release  # Bumps version, syncs plugins, pushes with tags
```

For minor/major versions:
```bash
npm version minor && git push --follow-tags
npm version major && git push --follow-tags
```
