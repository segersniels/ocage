/**
 * Token storage and management
 * - Reads OAuth tokens from OpenCode's auth.json
 * - Stores additional tokens (browser cookies) in ~/.config/ocage/tokens.json
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "";
const OPENCODE_AUTH = join(HOME, ".local/share/opencode/auth.json");
const CODEX_AUTH = join(HOME, ".codex/auth.json");
const CLAUDE_AUTH = join(HOME, ".claude/.credentials.json");
const OCAGE_CONFIG_DIR = join(HOME, ".config/ocage");
const OCAGE_TOKENS = join(OCAGE_CONFIG_DIR, "tokens.json");

export interface ProviderToken {
  type: "oauth" | "api" | "cookie";
  token: string;
  expires?: number;
  updatedAt: number;
  accountId?: string;
}

export interface TokenStore {
  anthropic: ProviderToken[];
  openai: ProviderToken[];
  kimi: ProviderToken[];
}

interface OpenCodeAuth {
  anthropic?: {
    type: string;
    access?: string;
    refresh?: string;
    expires?: number;
  };
  openai?: {
    type: string;
    access?: string;
    refresh?: string;
    expires?: number;
    accountId?: string;
  };
  "kimi-for-coding"?: { type: string; key?: string };
}

interface CodexAuth {
  tokens?: {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    account_id?: string;
  };
  last_refresh?: string;
}

interface ClaudeAuth {
  claudeAiOauth?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scopes?: string[];
  };
}

/**
 * Load Claude Code credentials from macOS Keychain
 */
function loadClaudeKeychainCredentials(): ClaudeAuth | null {
  if (process.platform !== "darwin") {
    return null;
  }

  try {
    const output = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
      { encoding: "utf-8" }
    ).trim();

    return output ? (JSON.parse(output) as ClaudeAuth) : null;
  } catch {
    return null;
  }
}

/**
 * Log which auth sources are available on the filesystem (one-time startup log)
 */
export function logAuthSources(): void {
  const sources: string[] = [];

  if (existsSync(OPENCODE_AUTH)) {
    sources.push("OpenCode");
  }

  if (existsSync(CODEX_AUTH)) {
    sources.push("Codex");
  }

  if (existsSync(CLAUDE_AUTH) || loadClaudeKeychainCredentials()) {
    sources.push("Claude Code");
  }

  if (existsSync(OCAGE_TOKENS)) {
    sources.push("ocage tokens");
  }

  if (sources.length > 0) {
    console.log(`[tokens] Detected auth sources: ${sources.join(", ")}`);
  } else {
    console.log("[tokens] No auth sources detected");
  }
}

/**
 * Load tokens from all sources: OpenCode, Codex, Claude Code, and our own store
 * Returns all tokens found, sorted by priority (OpenCode > Codex/Claude > manual)
 */
export function loadTokens(): TokenStore {
  const store: TokenStore = {
    anthropic: [],
    openai: [],
    kimi: [],
  };

  // Check for ANTHROPIC_ACCESS_TOKEN env var (highest priority, useful for Docker)
  if (process.env.ANTHROPIC_ACCESS_TOKEN) {
    store.anthropic.push({
      type: "oauth",
      token: process.env.ANTHROPIC_ACCESS_TOKEN,
      updatedAt: Date.now(),
    });
  }

  // Load from OpenCode auth.json
  try {
    const openCodeAuth: OpenCodeAuth = JSON.parse(
      readFileSync(OPENCODE_AUTH, "utf-8")
    );

    if (openCodeAuth.anthropic?.access) {
      store.anthropic.push({
        type: "oauth",
        token: openCodeAuth.anthropic.access,
        expires: openCodeAuth.anthropic.expires,
        updatedAt: Date.now(),
      });
    }

    if (openCodeAuth.openai?.access) {
      store.openai.push({
        type: "oauth",
        token: openCodeAuth.openai.access,
        expires: openCodeAuth.openai.expires,
        updatedAt: Date.now(),
        accountId: openCodeAuth.openai.accountId,
      });
    }
  } catch {
    // OpenCode auth not available
  }

  // Load from Codex CLI (~/.codex/auth.json) as fallback for OpenAI
  try {
    const codexAuth: CodexAuth = JSON.parse(readFileSync(CODEX_AUTH, "utf-8"));
    if (codexAuth.tokens?.access_token) {
      store.openai.push({
        type: "oauth",
        token: codexAuth.tokens.access_token,
        updatedAt: Date.now(),
        accountId: codexAuth.tokens.account_id,
      });
    }
  } catch {
    // Codex auth not available
  }

  // Load from Claude Code as fallback for Anthropic
  // Supports both file-based (Linux) and keychain-based (macOS) storage
  try {
    let claudeAuth: ClaudeAuth | null = null;

    // Try file-based first (Linux)
    if (existsSync(CLAUDE_AUTH)) {
      claudeAuth = JSON.parse(readFileSync(CLAUDE_AUTH, "utf-8"));
    } else {
      // Try macOS Keychain
      claudeAuth = loadClaudeKeychainCredentials();
    }

    if (claudeAuth?.claudeAiOauth?.accessToken) {
      store.anthropic.push({
        type: "oauth",
        token: claudeAuth.claudeAiOauth.accessToken,
        expires: claudeAuth.claudeAiOauth.expiresAt,
        updatedAt: Date.now(),
      });
    }
  } catch {
    // Claude Code auth not available
  }

  // Load our own tokens (browser cookies for Kimi)
  try {
    const ocageTokens = JSON.parse(readFileSync(OCAGE_TOKENS, "utf-8"));

    // Kimi cookie token (from browser)
    if (ocageTokens.kimi?.token) {
      store.kimi.push(ocageTokens.kimi);
    }
  } catch {
    // Ocage tokens not available yet
  }

  return store;
}

/**
 * Save a token to our own store
 */
export function saveToken(
  provider: keyof TokenStore,
  token: ProviderToken
): void {
  // Ensure config dir exists
  if (!existsSync(OCAGE_CONFIG_DIR)) {
    mkdirSync(OCAGE_CONFIG_DIR, { recursive: true });
  }

  // Load existing tokens
  let existing: Record<string, ProviderToken> = {};
  try {
    existing = JSON.parse(readFileSync(OCAGE_TOKENS, "utf-8"));
  } catch {
    // File doesn't exist yet
  }

  // Update and save
  existing[provider] = token;
  writeFileSync(OCAGE_TOKENS, JSON.stringify(existing, null, 2));
}

/**
 * Check if a token is valid (not expired)
 */
export function isTokenValid(token: ProviderToken | undefined): boolean {
  if (!token?.token) {
    return false;
  }

  if (token.expires && token.expires < Date.now()) {
    return false;
  }

  return true;
}

/**
 * Get the first valid token for a provider (highest priority)
 */
export function getFirstValidToken(
  tokens: ProviderToken[]
): ProviderToken | undefined {
  for (const token of tokens) {
    if (isTokenValid(token)) {
      return token;
    }
  }
  return undefined;
}

/**
 * Get auth status for all providers
 */
export function getAuthStatus(): Record<
  string,
  { authenticated: boolean; type?: string }
> {
  const tokens = loadTokens();

  const anthropicValid = getFirstValidToken(tokens.anthropic);
  const openaiValid = getFirstValidToken(tokens.openai);
  const kimiValid = getFirstValidToken(tokens.kimi);

  return {
    anthropic: {
      authenticated: !!anthropicValid,
      type: anthropicValid?.type,
    },
    openai: {
      authenticated: !!openaiValid,
      type: openaiValid?.type,
    },
    kimi: {
      authenticated: !!kimiValid,
      type: kimiValid?.type,
    },
  };
}

/**
 * Check if kimi CLI binary exists in PATH
 */
export function isKimiInstalled(): boolean {
  try {
    execSync("which kimi", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
