# ocage

A real-time dashboard for monitoring OpenCode usage limits across providers.

<p align="center">
  <img src="./.github/image.png" alt="ocage" />
</p>

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/segersniels/ocage/master/install.sh | bash
```

<details>
<summary>Build from source</summary>

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/segersniels/ocage.git
cd ocage
bun install
make install
```

</details>

## Docker

You can also run ocage in Docker. The container needs access to your local config directories to read provider credentials.

### docker run

```bash
docker run -p 3333:3333 \
  -v ~/.local/share/opencode:/home/ocage/.local/share/opencode:ro \
  -v ~/.codex:/home/ocage/.codex:ro \
  -v ~/.claude:/home/ocage/.claude:ro \
  -v ~/.config/ocage:/home/ocage/.config/ocage \
  segersniels/ocage:latest
```

### Volumes

Mount the directories containing your provider credentials:

| Volume                    | Description                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `~/.local/share/opencode` | OpenCode credentials                                                         |
| `~/.codex`                | Codex credentials                                                            |
| `~/.claude`               | Claude Code credentials                                                      |
| `~/.config/ocage`         | ocage token store (for Kimi browser cookies and tokens added through the UI) |

Mount only the volumes for providers you use. For example, if you only use OpenCode and Claude Code:

```bash
docker run -p 3333:3333 \
  -v ~/.local/share/opencode:/home/ocage/.local/share/opencode:ro \
  -v ~/.claude:/home/ocage/.claude:ro \
  -v ~/.config/ocage:/home/ocage/.config/ocage \
  segersniels/ocage:latest
```

### docker-compose

Alternatively, use the provided [`docker-compose.yml`](./docker-compose.yml):

```bash
docker-compose up -d
```

## License

MIT
