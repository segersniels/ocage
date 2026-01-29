/**
 * Provider usage fetchers
 * Fetches rate limit usage from provider APIs
 */

import { loadTokens } from "./tokens";

interface AnthropicUsageWindow {
  utilization?: number;
  resets_at?: string;
}

interface AnthropicUsageResponse {
  five_hour?: AnthropicUsageWindow;
  seven_day?: AnthropicUsageWindow;
}

interface KimiUsageDetail {
  limit: string;
  used?: string;
  remaining?: string;
  resetTime: string;
}

interface KimiRateLimit {
  window: { duration: number; timeUnit: string };
  detail: KimiUsageDetail;
}

interface KimiUsage {
  scope: string;
  detail: KimiUsageDetail;
  limits?: KimiRateLimit[];
}

interface KimiUsageResponse {
  usages: KimiUsage[];
}

export interface RateLimit {
  usedPercent: number;
  resetsAt?: Date;
}

export interface ProviderUsage {
  provider: string;
  authenticated: boolean;
  error?: string;
  fiveHourLimit?: RateLimit;
  weeklyLimit?: RateLimit;
  updatedAt: Date;
}

/**
 * Fetch Anthropic usage via OAuth API
 */
async function fetchAnthropicUsage(token: string): Promise<ProviderUsage> {
  try {
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        Accept: "application/json",
        "User-Agent": "ocage",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return {
          provider: "anthropic",
          authenticated: false,
          error: "Token expired",
          updatedAt: new Date(),
        };
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as AnthropicUsageResponse;

    return {
      provider: "anthropic",
      authenticated: true,
      fiveHourLimit: data.five_hour
        ? {
            usedPercent: data.five_hour.utilization ?? 0,
            resetsAt: data.five_hour.resets_at
              ? new Date(data.five_hour.resets_at)
              : undefined,
          }
        : undefined,
      weeklyLimit: data.seven_day
        ? {
            usedPercent: data.seven_day.utilization ?? 0,
            resetsAt: data.seven_day.resets_at
              ? new Date(data.seven_day.resets_at)
              : undefined,
          }
        : undefined,
      updatedAt: new Date(),
    };
  } catch (err) {
    return {
      provider: "anthropic",
      authenticated: true,
      error: err instanceof Error ? err.message : "Unknown error",
      updatedAt: new Date(),
    };
  }
}

/**
 * Decode Kimi JWT to extract session headers
 */
function decodeKimiJWT(
  jwt: string
): { deviceId?: string; sessionId?: string; trafficId?: string } | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], "base64url").toString();
    const data = JSON.parse(payload);

    return {
      deviceId: data.device_id,
      sessionId: data.ssid,
      trafficId: data.sub,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch Kimi usage via their billing API (requires kimi-auth cookie)
 */
async function fetchKimiUsage(token: string): Promise<ProviderUsage> {
  try {
    const sessionInfo = decodeKimiJWT(token);

    const res = await fetch(
      "https://www.kimi.com/apiv2/kimi.gateway.billing.v1.BillingService/GetUsages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Cookie: `kimi-auth=${token}`,
          Origin: "https://www.kimi.com",
          Referer: "https://www.kimi.com/code/console",
          Accept: "*/*",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "connect-protocol-version": "1",
          "x-language": "en-US",
          "x-msh-platform": "web",
          "r-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(sessionInfo?.deviceId && {
            "x-msh-device-id": sessionInfo.deviceId,
          }),
          ...(sessionInfo?.sessionId && {
            "x-msh-session-id": sessionInfo.sessionId,
          }),
          ...(sessionInfo?.trafficId && {
            "x-traffic-id": sessionInfo.trafficId,
          }),
        },
        body: JSON.stringify({ scope: ["FEATURE_CODING"] }),
      }
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return {
          provider: "kimi",
          authenticated: false,
          error: "Token expired",
          updatedAt: new Date(),
        };
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as KimiUsageResponse;

    const codingUsage = data.usages?.find(
      (u: KimiUsage) => u.scope === "FEATURE_CODING"
    );
    if (!codingUsage) {
      throw new Error("FEATURE_CODING scope not found");
    }

    // Weekly limit from main detail
    const weeklyDetail = codingUsage.detail;
    const weeklyUsed = parseInt(weeklyDetail.used || "0", 10);
    const weeklyTotal = parseInt(weeklyDetail.limit || "1", 10);
    const weeklyPercent =
      weeklyTotal > 0 ? (weeklyUsed / weeklyTotal) * 100 : 0;

    // 5-hour limit from limits array
    const fiveHourDetail = codingUsage.limits?.[0]?.detail;
    let fiveHourLimit: RateLimit | undefined;
    if (fiveHourDetail) {
      const used = parseInt(fiveHourDetail.used || "0", 10);
      const total = parseInt(fiveHourDetail.limit || "1", 10);
      fiveHourLimit = {
        usedPercent: total > 0 ? (used / total) * 100 : 0,
        resetsAt: fiveHourDetail.resetTime
          ? new Date(fiveHourDetail.resetTime)
          : undefined,
      };
    }

    return {
      provider: "kimi",
      authenticated: true,
      fiveHourLimit,
      weeklyLimit: {
        usedPercent: weeklyPercent,
        resetsAt: weeklyDetail.resetTime
          ? new Date(weeklyDetail.resetTime)
          : undefined,
      },
      updatedAt: new Date(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (
      message.includes("unauthenticated") ||
      message.includes("INVALID_AUTH")
    ) {
      return {
        provider: "kimi",
        authenticated: false,
        error: "Token invalid",
        updatedAt: new Date(),
      };
    }

    return {
      provider: "kimi",
      authenticated: true,
      error: message,
      updatedAt: new Date(),
    };
  }
}

/**
 * Find codex binary path
 */
function findCodexPath(): string | null {
  // TEMP: Force CLI not found for testing Connect button
  return null;

  /*
  const home = process.env.HOME || "";
  const candidates = [
    `${home}/.bun/bin/codex`,
    `${home}/.local/bin/codex`,
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ];

  for (const path of candidates) {
    const check = Bun.spawnSync(["test", "-x", path]);
    if (check.exitCode === 0) return path;
  }

  const which = Bun.spawnSync(["which", "codex"]);
  if (which.exitCode === 0) {
    return which.stdout.toString().trim();
  }

  return null;
  */
}

/**
 * Fetch OpenAI/Codex usage via CLI RPC
 */
async function fetchCodexUsage(): Promise<ProviderUsage> {
  try {
    const codexPath = findCodexPath();
    if (!codexPath) {
      return {
        provider: "openai",
        authenticated: false,
        error: "Install Codex CLI",
        updatedAt: new Date(),
      };
    }

    const rpcMessages = [
      '{"id":1,"method":"initialize","params":{"clientInfo":{"name":"ocage","version":"0.1"}}}',
      '{"method":"initialized"}',
      '{"id":2,"method":"account/rateLimits/read"}',
    ].join("\n");

    const proc = Bun.spawnSync(
      [
        "sh",
        "-c",
        `echo '${rpcMessages}' | "${codexPath}" -s read-only -a untrusted app-server 2>/dev/null | grep '"id":2'`,
      ],
      {
        env: {
          ...process.env,
          PATH: (process.env.PATH || "") + ":/opt/homebrew/bin:/usr/local/bin",
        },
      }
    );

    const result = proc.stdout.toString();

    if (!result.trim()) {
      return {
        provider: "openai",
        authenticated: false,
        error: "Run 'codex' to authenticate",
        updatedAt: new Date(),
      };
    }

    const data = JSON.parse(result.trim());
    const limits = data.result?.rateLimits;

    if (!limits) {
      return {
        provider: "openai",
        authenticated: false,
        error: "Invalid response",
        updatedAt: new Date(),
      };
    }

    return {
      provider: "openai",
      authenticated: true,
      fiveHourLimit: limits.primary
        ? {
            usedPercent: limits.primary.usedPercent ?? 0,
            resetsAt: limits.primary.resetsAt
              ? new Date(limits.primary.resetsAt * 1000)
              : undefined,
          }
        : undefined,
      weeklyLimit: limits.secondary
        ? {
            usedPercent: limits.secondary.usedPercent ?? 0,
            resetsAt: limits.secondary.resetsAt
              ? new Date(limits.secondary.resetsAt * 1000)
              : undefined,
          }
        : undefined,
      updatedAt: new Date(),
    };
  } catch (err) {
    return {
      provider: "openai",
      authenticated: false,
      error: err instanceof Error ? err.message : "Unknown error",
      updatedAt: new Date(),
    };
  }
}

/**
 * Fetch usage for all configured providers
 */
export async function fetchAllProviderUsage(): Promise<ProviderUsage[]> {
  const tokens = loadTokens();
  const results: ProviderUsage[] = [];

  // Anthropic
  if (tokens.anthropic?.token) {
    results.push(await fetchAnthropicUsage(tokens.anthropic.token));
  } else {
    results.push({
      provider: "anthropic",
      authenticated: false,
      updatedAt: new Date(),
    });
  }

  // Kimi
  if (tokens.kimi?.token) {
    results.push(await fetchKimiUsage(tokens.kimi.token));
  } else {
    results.push({
      provider: "kimi",
      authenticated: false,
      updatedAt: new Date(),
    });
  }

  // OpenAI/Codex - requires CLI
  results.push(await fetchCodexUsage());

  return results;
}
