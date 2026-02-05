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
