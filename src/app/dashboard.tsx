import { ProviderCard } from "../components/provider-card";
import type { ProviderUsage } from "../server/providers";

export function Dashboard({ providers }: { providers: ProviderUsage[] }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="fixed top-8 left-8">
        <span className="logo text-2xl font-medium text-gray-900">ocage</span>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6">
          <div className="text-gray-300 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            No providers detected
          </h2>
          <p className="text-sm text-gray-500 max-w-md">
            Install OpenCode, Codex CLI, or Claude Code and authenticate to see
            your usage stats.
          </p>
        </div>
      ) : (
        <div className="flex flex-row gap-16 w-full max-w-5xl px-6 justify-center items-start">
          {providers.map((p) => (
            <ProviderCard key={p.provider} provider={p} />
          ))}
        </div>
      )}

      <div className="fixed bottom-8 text-xs text-gray-300">
        Updates every 5s
      </div>
    </div>
  );
}
