# Claude

## Read the docs

Read the docs before responding to the user:

@roadmap.md
@README.md

- <https://modelcontextprotocol.io/tutorials/building-mcp-with-llms>
- <https://docs.anthropic.com/en/docs/claude-code/hooks>
- <https://docs.claude.com/en/docs/claude-code/plugins-reference>

## Local development rules

- **NEVER** use `npx mcp-voice-hooks` or `npx mcp-voice-hooks@latest` commands in this repo. This is the source repository — always use local scripts and builds:
  - `node bin/cli.js` instead of `npx mcp-voice-hooks`
  - `node bin/cli.js install-hooks` instead of `npx mcp-voice-hooks install-hooks`
  - `npm run build` to build from source
