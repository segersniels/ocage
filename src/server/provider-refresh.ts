import type { ProviderToken } from "./tokens";
import type { ProviderUsage } from "./provider-types";

interface ProviderFailureState {
  disabled: boolean;
  tokenFailures: number;
  tokensSignature: string;
  lastUsage?: ProviderUsage;
}

interface FallbackResult {
  result: ProviderUsage | null;
  lastFailure?: ProviderUsage;
  hadTokenFailure: boolean;
  winnerIndex?: number;
  winnerToken?: ProviderToken;
}

const lastProviderError: Map<string, string> = new Map();
const fallbackLogState: Map<string, number> = new Map();
const providerFailureState: Map<string, ProviderFailureState> = new Map();
export const MAX_TOKEN_FAILURES = 10;
const FALLBACK_LOG_WINDOW_MS = 60_000;

export function logProviderError(provider: string, message: string): void {
  const lastMessage = lastProviderError.get(provider);

  if (lastMessage !== message) {
    lastProviderError.set(provider, message);
    console.error(`[providers] ${provider} fetch failed: ${message}`);
  }
}

function logFallback(provider: string): void {
  const lastLoggedAt = fallbackLogState.get(provider) ?? 0;
  const now = Date.now();

  if (now - lastLoggedAt >= FALLBACK_LOG_WINDOW_MS) {
    fallbackLogState.set(provider, now);
    console.log(`[providers] ${provider}: token failed, trying next...`);
  }
}

export function getTokensSignature(tokens: ProviderToken[]): string {
  return tokens
    .map((token) => `${token.type}:${token.accountId ?? ""}:${token.token}`)
    .join("|");
}

export function getProviderFailureState(
  provider: string,
  tokensSignature: string
): ProviderFailureState {
  const existing = providerFailureState.get(provider);

  if (!existing) {
    const state: ProviderFailureState = {
      disabled: false,
      tokenFailures: 0,
      tokensSignature,
    };
    providerFailureState.set(provider, state);

    return state;
  }

  if (existing.tokensSignature !== tokensSignature) {
    existing.disabled = false;
    existing.tokenFailures = 0;
    existing.tokensSignature = tokensSignature;
    existing.lastUsage = undefined;
  }

  return existing;
}

export function buildAllTokensFailedUsage(provider: string): ProviderUsage {
  return {
    provider,
    authenticated: false,
    error: "All tokens expired or invalid",
    updatedAt: new Date(),
  };
}

export function buildDisabledUsage(
  provider: string,
  lastUsage?: ProviderUsage
): ProviderUsage {
  if (lastUsage) {
    return lastUsage;
  }

  return {
    provider,
    authenticated: false,
    error: "Refresh disabled after repeated token failures",
    updatedAt: new Date(),
  };
}

export async function tryFetchWithFallback(
  provider: string,
  tokens: ProviderToken[],
  fetcher: (token: ProviderToken) => Promise<ProviderUsage>
): Promise<FallbackResult> {
  let lastFailure: ProviderUsage | undefined;
  let hadTokenFailure = false;

  for (const [index, token] of tokens.entries()) {
    const result = await fetcher(token);
    if (result.authenticated && !result.error) {
      fallbackLogState.delete(provider);

      return {
        result,
        lastFailure,
        hadTokenFailure,
        winnerIndex: index,
        winnerToken: token,
      };
    }

    if (!result.authenticated) {
      hadTokenFailure = true;
    }

    lastFailure = result;

    if (index < tokens.length - 1) {
      logFallback(provider);
    }
  }

  return {
    result: null,
    lastFailure,
    hadTokenFailure,
  };
}
