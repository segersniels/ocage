export type ProviderId = "anthropic" | "openai" | "kimi";

export interface ProviderMeta {
  name: string;
  iconUrl: string;
  hasManualConnect: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  anthropic: {
    name: "Claude",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/claude-ai.svg",
    hasManualConnect: false,
  },
  openai: {
    name: "Codex",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/openai.svg",
    hasManualConnect: false,
  },
  kimi: {
    name: "Kimi",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kimi-ai.svg",
    hasManualConnect: true,
  },
};

export const FALLBACK_PROVIDER: ProviderMeta = {
  name: "Unknown",
  iconUrl:
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/question.svg",
  hasManualConnect: false,
};

export function getProviderMeta(id: string): ProviderMeta {
  return PROVIDERS[id as ProviderId] ?? FALLBACK_PROVIDER;
}
