export const POLICY_DEFAULTS = { singleTransactionLimit: 35, dailyLimit: 100 } as const;
export const POLICY_BOUNDS = {
  singleTransactionLimit: { min: 1, max: 2500 },
  dailyLimit: { min: 1, max: 10000 },
} as const;

export type PolicyLimits = { singleTransactionLimit: number; dailyLimit: number };

export function validateLimits(l: PolicyLimits): string[] {
  const errors: string[] = [];
  const s = POLICY_BOUNDS.singleTransactionLimit;
  const d = POLICY_BOUNDS.dailyLimit;
  if (!Number.isFinite(l.singleTransactionLimit) || l.singleTransactionLimit < s.min || l.singleTransactionLimit > s.max)
    errors.push(`Single transaction limit must be between $${s.min} and $${s.max.toLocaleString()}.`);
  if (!Number.isFinite(l.dailyLimit) || l.dailyLimit < d.min || l.dailyLimit > d.max)
    errors.push(`Daily limit must be between $${d.min} and $${d.max.toLocaleString()}.`);
  if (l.singleTransactionLimit > l.dailyLimit) errors.push("Single transaction limit cannot exceed the daily limit.");
  return errors;
}

/** A purchase needs explicit override when it breaks either the per-transaction limit or the remaining daily balance. */
export function requiresOverride(total: number, limits: PolicyLimits, remainingToday: number): boolean {
  return total > limits.singleTransactionLimit || total > remainingToday;
}

export function formatUSD(n: number | null | undefined, currency = "USD") {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
}
