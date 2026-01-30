export type ProviderId = "anthropic" | "openai" | "kimi";

export interface ProviderMeta {
  name: string;
  iconUrl: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  anthropic: {
    name: "Claude",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/claude-ai.svg",
  },
  openai: {
    name: "Codex",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/openai.svg",
  },
  kimi: {
    name: "Kimi",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kimi-ai.svg",
  },
};

export const FALLBACK_PROVIDER: ProviderMeta = {
  name: "Unknown",
  iconUrl:
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/question.svg",
};

export function getProviderMeta(id: string): ProviderMeta {
  return PROVIDERS[id as ProviderId] ?? FALLBACK_PROVIDER;
}
