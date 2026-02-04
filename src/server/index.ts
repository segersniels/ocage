#!/usr/bin/env bun

import index from "../index.html";
import { getConfig } from "./config";
import { fetchAllProviderUsage, type ProviderUsage } from "./providers";
import { logAuthSources, saveToken } from "./tokens";

const config = getConfig();

let cachedProviders: ProviderUsage[] = [];

/** Track last logged state per provider to avoid log spam */
const lastLoggedState: Map<string, string> = new Map();

async function refreshProviders() {
  cachedProviders = await fetchAllProviderUsage();

  // Log state changes only (avoid spamming same error every 5s)
  for (const provider of cachedProviders) {
    const currentState =
      provider.error ?? (provider.authenticated ? "ok" : "not_authenticated");
    const lastState = lastLoggedState.get(provider.provider);

    if (currentState !== lastState) {
      lastLoggedState.set(provider.provider, currentState);

      if (provider.error) {
        console.error(`[server] ${provider.provider}: ${provider.error}`);
      } else if (!provider.authenticated) {
        console.warn(`[server] ${provider.provider}: not authenticated`);
      } else if (lastState !== undefined) {
        // Only log recovery if we previously had an issue
        console.log(`[server] ${provider.provider}: connected`);
      }
    }
  }
}

async function main() {
  // Log detected auth sources once at startup
  logAuthSources();

  await refreshProviders();

  const server = Bun.serve({
    port: config.port,

    routes: {
      "/*": index,

      "/api/providers": {
        GET() {
          return Response.json(cachedProviders);
        },
      },

      "/api/connect": {
        async POST(req) {
          try {
            const body = (await req.json()) as {
              provider: "anthropic" | "openai" | "kimi";
              token: string;
            };

            if (!body.provider || !body.token) {
              return Response.json(
                { error: "Missing provider or token" },
                { status: 400 }
              );
            }

            saveToken(body.provider, {
              type: "cookie",
              token: body.token,
              updatedAt: Date.now(),
            });
            console.log(`[server] Saved token for ${body.provider}`);

            await refreshProviders();

            return Response.json({ success: true });
          } catch {
            return Response.json({ error: "Invalid request" }, { status: 400 });
          }
        },
      },
    },

    development: process.env.NODE_ENV !== "production" && {
      hmr: true,
      console: true,
    },
  });

  console.log(`Server running at ${server.url}`);

  if (config.autoOpen) {
    try {
      // Warm up the bundle before opening browser (Bun compiles on-demand)
      await fetch(new URL("/index.tsx", server.url));
      const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
      const proc = Bun.spawn([openCmd, server.url.href]);
      await proc.exited;
    } catch {
      // Silent fail
    }
  }

  // Refresh provider data periodically
  setInterval(refreshProviders, 5_000);

  console.log("\nPress Ctrl+C to stop\n");
}

main().catch(console.error);
