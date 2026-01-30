#!/usr/bin/env bun

import { getConfig } from "./config";
import index from "./index.html";
import { fetchAllProviderUsage, type ProviderUsage } from "./providers";
import { saveToken } from "./tokens";

const config = getConfig();

let cachedProviders: ProviderUsage[] = [];

async function refreshProviders() {
  cachedProviders = await fetchAllProviderUsage();
}

async function main() {
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
      await fetch(new URL("/frontend.tsx", server.url));
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
