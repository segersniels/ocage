# OCAGE - AI Provider Rate Limit Monitor

A real-time dashboard for monitoring rate limits across AI providers (Anthropic, OpenAI, Kimi).

## Features

- Multi-provider rate limit monitoring
- 5-hour and weekly limit visualization
- Auto-refreshing dashboard (5s interval)
- OAuth token integration with OpenCode
- Manual token input for providers without OAuth (Kimi)
- Single binary deployment

## Quick Start

```bash
# Run directly with bun
bun src/index.ts

# Or build a standalone binary
bun build src/index.ts --compile --outfile ocage
./ocage
```

The dashboard will auto-open at `http://localhost:3333`.

Press `Ctrl+C` to stop.

## Configuration

Environment variables:

- `PORT` - Server port (default: 3333)
- `NO_OPEN=1` - Disable auto-open browser

## Data Sources

**OAuth tokens** (automatic):

- Reads from `~/.local/share/opencode/auth.json`
- Supports Anthropic and OpenAI OAuth tokens from OpenCode

**Cookie tokens** (manual):

- Stored in `~/.config/ocage/tokens.json`
- Add via the dashboard connect page
- Required for Kimi (uses `kimi-auth` cookie)

**Provider APIs**:

- Anthropic: `api.anthropic.com/api/oauth/usage`
- OpenAI: `chatgpt.com/backend-api/wham/usage`
- Kimi: `kimi.com/apiv2/.../GetUsages`

## Requirements

- [Bun](https://bun.sh) runtime
- OpenCode with OAuth configured (for Anthropic/OpenAI)

## License

MIT
