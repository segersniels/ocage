import type { ProviderUsage } from "../providers";
import { ProviderCard } from "./ProviderCard";

export function Dashboard({ providers }: { providers: ProviderUsage[] }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="fixed top-8 left-8">
        <span className="logo text-2xl font-medium text-gray-900">ocage</span>
      </div>

      <div className="flex flex-row gap-16 w-full max-w-5xl px-6 justify-center items-start">
        {providers.map((p) => (
          <ProviderCard key={p.provider} provider={p} />
        ))}
      </div>

      <div className="fixed bottom-8 text-xs text-gray-300">
        Updates every 5s
      </div>
    </div>
  );
}
