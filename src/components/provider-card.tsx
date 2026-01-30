import { getProviderMeta } from "../lib/constants";
import { navigate } from "../lib/navigation";
import type { ProviderUsage, RateLimit } from "../server/providers";
import { Button } from "./button";

function formatResetTime(date: Date): string {
  const now = new Date();
  const diff = new Date(date).getTime() - now.getTime();

  if (diff < 0) {
    return "soon";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);

    return `in ${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }

  return `in ${minutes}m`;
}

function Header({
  name,
  iconUrl,
  dimmed,
}: {
  name: string;
  iconUrl: string;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <img
        src={iconUrl}
        alt=""
        className={`w-5 h-5 ${dimmed ? "opacity-40 grayscale" : ""}`}
      />
      <span className="text-sm font-medium text-gray-900 logo">{name}</span>
    </div>
  );
}

function UsageBar({
  label,
  limit,
  skeleton,
}: {
  label: string;
  limit?: RateLimit;
  skeleton?: boolean;
}) {
  if (skeleton || !limit) {
    return (
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs text-gray-300 uppercase tracking-wide">
            {label}
          </span>
          <span className="text-sm font-medium tabular-nums text-gray-300">
            --
          </span>
        </div>
        <div className="h-0.5 bg-gray-200" />
        <div className="text-xs text-gray-200 mt-1.5">in --</div>
      </div>
    );
  }

  const remaining = Math.max(0, 100 - limit.usedPercent);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {remaining.toFixed(0)}%
        </span>
      </div>
      <div className="h-0.5 bg-gray-100">
        <div
          className="h-full bg-gray-900 transition-all duration-300"
          style={{ width: `${remaining}%` }}
        />
      </div>
      {limit.resetsAt && (
        <div className="text-xs text-gray-300 mt-1.5">
          {formatResetTime(limit.resetsAt)}
        </div>
      )}
    </div>
  );
}

export function ProviderCard({ provider }: { provider: ProviderUsage }) {
  const info = getProviderMeta(provider.provider);

  if (!provider.authenticated) {
    return (
      <div className="w-64 py-6 relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/connect/${provider.provider}`)}
          className="absolute top-5 right-0"
        >
          Connect
        </Button>
        <Header name={info.name} iconUrl={info.iconUrl} dimmed />
        <div className="space-y-5">
          <UsageBar label="5H" skeleton />
          <UsageBar label="WEEK" skeleton />
        </div>
      </div>
    );
  }

  if (provider.error) {
    return (
      <button
        type="button"
        onClick={() => navigate(`/connect/${provider.provider}`)}
        className="group block w-64 py-6 transition-colors hover:bg-gray-50/50 text-left"
      >
        <Header name={info.name} iconUrl={info.iconUrl} dimmed />
        <div className="space-y-1">
          <span className="text-xs text-red-400 block">{provider.error}</span>
          <span className="text-xs text-gray-400 group-hover:text-gray-600">
            Click to reconnect
          </span>
        </div>
      </button>
    );
  }

  const hasLimits = provider.fiveHourLimit || provider.weeklyLimit;

  return (
    <div className="w-64 py-6">
      <Header name={info.name} iconUrl={info.iconUrl} />
      {hasLimits ? (
        <div className="space-y-5">
          {provider.fiveHourLimit && (
            <UsageBar label="5H" limit={provider.fiveHourLimit} />
          )}
          {provider.weeklyLimit && (
            <UsageBar label="WEEK" limit={provider.weeklyLimit} />
          )}
        </div>
      ) : (
        <span className="text-xs text-gray-400">No rate limits</span>
      )}
    </div>
  );
}
