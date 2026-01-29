# OCAGE - OpenCode Token Usage Monitor

A real-time dashboard for monitoring your OpenCode token usage across different AI providers and models.

## Features

- Real-time token usage tracking (5h session + weekly limits)
- Activity heatmap showing 30-day usage patterns
- Model/provider usage breakdown
- Auto-refreshing dashboard
- File watcher for live updates
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
- `OPENCODE_STORAGE_PATH` - Custom storage path

## Data Source

Reads from `~/.local/share/opencode/storage/`:
- Session metadata
- Message data with token counts
- Provider/model information

All data stays local - nothing is sent externally.

## Requirements

- [Bun](https://bun.sh) runtime
- OpenCode installed with usage data

## License

MIT
