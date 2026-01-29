/**
 * Token storage and management
 * - Reads OAuth tokens from OpenCode's auth.json
 * - Stores additional tokens (browser cookies) in ~/.config/ocage/tokens.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "";
const OPENCODE_AUTH = join(HOME, ".local/share/opencode/auth.json");
const OCAGE_CONFIG_DIR = join(HOME, ".config/ocage");
const OCAGE_TOKENS = join(OCAGE_CONFIG_DIR, "tokens.json");

export interface ProviderToken {
  type: "oauth" | "api" | "cookie";
  token: string;
  expires?: number;
  updatedAt: number;
}

export interface TokenStore {
  anthropic?: ProviderToken;
  openai?: ProviderToken;
  kimi?: ProviderToken;
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
  };
  "kimi-for-coding"?: { type: string; key?: string };
}

/**
 * Load tokens from both OpenCode auth.json and our own token store
 */
export function loadTokens(): TokenStore {
  const store: TokenStore = {};

  // Load from OpenCode auth.json
  try {
    const openCodeAuth: OpenCodeAuth = JSON.parse(
      readFileSync(OPENCODE_AUTH, "utf-8")
    );

    if (openCodeAuth.anthropic?.access) {
      store.anthropic = {
        type: "oauth",
        token: openCodeAuth.anthropic.access,
        expires: openCodeAuth.anthropic.expires,
        updatedAt: Date.now(),
      };
    }

    if (openCodeAuth.openai?.access) {
      store.openai = {
        type: "oauth",
        token: openCodeAuth.openai.access,
        expires: openCodeAuth.openai.expires,
        updatedAt: Date.now(),
      };
    }
  } catch {
    // OpenCode auth not available
  }

  // Load our own tokens (browser cookies, manual tokens)
  try {
    const ocageTokens = JSON.parse(readFileSync(OCAGE_TOKENS, "utf-8"));

    // Kimi cookie token (from browser)
    if (ocageTokens.kimi?.token) {
      store.kimi = ocageTokens.kimi;
    }

    // Allow overriding OpenCode tokens if needed
    if (ocageTokens.anthropic?.token) {
      store.anthropic = ocageTokens.anthropic;
    }
    if (ocageTokens.openai?.token) {
      store.openai = ocageTokens.openai;
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
  if (!token?.token) return false;
  if (token.expires && token.expires < Date.now()) return false;
  return true;
}

/**
 * Get auth status for all providers
 */
export function getAuthStatus(): Record<
  string,
  { authenticated: boolean; type?: string }
> {
  const tokens = loadTokens();

  return {
    anthropic: {
      authenticated: isTokenValid(tokens.anthropic),
      type: tokens.anthropic?.type,
    },
    openai: {
      authenticated: isTokenValid(tokens.openai),
      type: tokens.openai?.type,
    },
    kimi: {
      authenticated: isTokenValid(tokens.kimi),
      type: tokens.kimi?.type,
    },
  };
}
