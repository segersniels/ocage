# ocage

A real-time dashboard for monitoring OpenCode usage limits across providers.

<p align="center">
  <img src="./.github/image.png" alt="ocage" />
</p>

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/segersniels/ocage/master/install.sh | bash
```

Then run the binary:

```bash
ocage
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
docker run -d -p 3333:3333 \
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
docker run -d -p 3333:3333 \
  -v ~/.local/share/opencode:/home/ocage/.local/share/opencode:ro \
  -v ~/.claude:/home/ocage/.claude:ro \
  -v ~/.config/ocage:/home/ocage/.config/ocage \
  segersniels/ocage:latest
```

### Environment Variables

You can pass tokens directly via environment variables (highest priority):

| Variable                 | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `ANTHROPIC_ACCESS_TOKEN` | Anthropic OAuth access token (bypasses keychain/file lookup) |

Useful for Docker environments where keychain access is not available.

### docker compose

Alternatively, use the provided [`docker-compose.yml`](./docker-compose.yml):

```bash
docker compose up -d
```

### macOS Limitations

On macOS, OAuth tokens stored in the system keychain cannot be accessed from within Docker containers. This affects providers that use OAuth authentication (OpenCode, Codex). To work around this:

1. Install and run ocage natively (`curl ... | bash && ocage`), or
2. Pass your Anthropic token via the `ANTHROPIC_ACCESS_TOKEN` environment variable (highest priority), or
3. Manually add tokens through the ocage UI (they will be stored in `~/.config/ocage` which is mounted into the container)

**Getting your Anthropic token from macOS Keychain:**

If you have Claude Code installed and authenticated, retrieve your token with:

```bash
security find-generic-password -s "Claude Code-credentials" -w | jq -r '.claudeAiOauth.accessToken'
```

Then run Docker with the token:

```bash
docker run -d -p 3333:3333 \
  -e ANTHROPIC_ACCESS_TOKEN="$(security find-generic-password -s "Claude Code-credentials" -w | jq -r '.claudeAiOauth.accessToken')" \
  -v ~/.config/ocage:/home/ocage/.config/ocage \
  segersniels/ocage:latest
```

## License

MIT
