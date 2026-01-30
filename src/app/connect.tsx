import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { Button } from "../components/button";
import { getProviderMeta } from "../lib/constants";
import { navigate } from "../lib/navigation";

const INSTRUCTIONS: Record<
  string,
  { steps: (string | ReactNode)[]; cookieName: string }
> = {
  kimi: {
    steps: [
      "Open kimi.com/code/console and sign in",
      "Open browser DevTools (F12 or Cmd+Option+I)",
      "Go to Application > Cookies > kimi.com",
      "Find the kimi-auth cookie",
      "Copy its value and paste below",
    ],
    cookieName: "kimi-auth",
  },
};

type Status = { message: string; type: "error" | "success" | "loading" };

export function ConnectPage({ provider }: { provider: string }) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  const { name } = getProviderMeta(provider);
  const info = INSTRUCTIONS[provider] || {
    steps: ["Unknown provider"],
    cookieName: "",
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token.trim()) {
      setStatus({ message: "Please enter a token", type: "error" });

      return;
    }

    setStatus({ message: "Connecting...", type: "loading" });

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, token: token.trim() }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (data.success) {
        setStatus({ message: "Connected! Redirecting...", type: "success" });
        setTimeout(() => navigate("/"), 1500);
      } else {
        setStatus({
          message: data.error || "Failed to connect",
          type: "error",
        });
      }
    } catch {
      setStatus({ message: "Network error", type: "error" });
    }
  }

  const statusColor =
    status?.type === "error"
      ? "text-red-500"
      : status?.type === "success"
        ? "text-green-600"
        : "text-gray-500";

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <Button
        variant="ghost"
        size="md"
        onClick={() => navigate("/")}
        className="mb-6"
      >
        &larr; Back to dashboard
      </Button>

      <h1 className="text-xl font-semibold mb-2">Connect {name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Follow these steps to connect your {name} account
      </p>

      <div className="border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="font-medium mb-3">Instructions</h2>
        <ol className="space-y-2 text-sm text-gray-600">
          {info.steps.map((step, i) => (
            <li key={i}>
              {i + 1}. {step}
            </li>
          ))}
        </ol>
      </div>

      {info.cookieName ? (
        <form
          onSubmit={handleSubmit}
          className="border border-gray-200 rounded-lg p-5"
        >
          <h2 className="font-medium mb-3">Paste Token</h2>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder={`Paste your ${info.cookieName} cookie value here...`}
          />
          <Button type="submit" className="mt-3 w-full">
            Connect {name}
          </Button>
          {status && (
            <p className={`mt-2 text-sm ${statusColor}`}>{status.message}</p>
          )}
        </form>
      ) : (
        <p className="text-sm text-gray-500">
          No manual configuration needed for this provider.
        </p>
      )}
    </div>
  );
}
