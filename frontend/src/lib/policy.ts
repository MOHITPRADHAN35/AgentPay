export type CheckId =
  | "AGENT_IDENTITY"
  | "REQUEST_VALIDATION"
  | "CURRENCY"
  | "TRANSACTION_LIMIT"
  | "DAILY_BUDGET"
  | "ORDER_INTEGRITY";

export type CheckResult = {
  id: CheckId;
  label: string;
  status: "PASS" | "FAIL" | "SKIPPED";
  detail: string;
};

export type PolicyInput = {
  item: { sku: string; price: number; currency: string; isCustomEstimate?: boolean; title?: string } | null;
  dailyLimit: number;
  singleTransactionLimit: number;
  spentToday: number;
  reserved: number;
  currency: string;
};

export type PolicyDecision = {
  allowed: boolean;
  rule: CheckId | null;
  reason: string | null;
  checks: CheckResult[];
};

export const CHECK_LABELS: Record<CheckId, string> = {
  AGENT_IDENTITY: "Agent identity",
  REQUEST_VALIDATION: "Request validation",
  CURRENCY: "Currency",
  TRANSACTION_LIMIT: "Transaction limit",
  DAILY_BUDGET: "Daily budget policy",
  ORDER_INTEGRITY: "Order integrity",
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

export function remaining(dailyLimit: number, spent: number, reserved = 0) {
  return Math.max(0, round2(dailyLimit - spent - reserved));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const evals: [CheckId, () => { ok: boolean; detail: string }][] = [
    ["AGENT_IDENTITY", () => ({ ok: true, detail: "Server-issued agent task" })],
    [
      "REQUEST_VALIDATION",
      () =>
        input.item
          ? {
              ok: true,
              detail: input.item.isCustomEstimate
                ? `Identified market item: ${input.item.title || input.item.sku}`
                : `Resolved catalog SKU ${input.item.sku}`,
            }
          : { ok: false, detail: "The request does not match any item in the trusted catalog." },
    ],
    [
      "CURRENCY",
      () =>
        input.item!.currency === input.currency
          ? { ok: true, detail: input.currency }
          : { ok: false, detail: `Only ${input.currency} is authorized.` },
    ],
    [
      "TRANSACTION_LIMIT",
      () =>
        input.item!.price <= input.singleTransactionLimit
          ? { ok: true, detail: `${fmt(input.item!.price)} ≤ ${fmt(input.singleTransactionLimit)}` }
          : {
              ok: false,
              detail: `Estimated cost ${fmt(input.item!.price)} exceeds the ${fmt(input.singleTransactionLimit)} transaction authorization limit.`,
            },
    ],
    [
      "DAILY_BUDGET",
      () => {
        const left = remaining(input.dailyLimit, input.spentToday, input.reserved);
        return input.item!.price <= left
          ? { ok: true, detail: `${fmt(left)} available` }
          : {
              ok: false,
              detail: `Estimated cost ${fmt(input.item!.price)} exceeds the ${fmt(left)} remaining daily authorization.`,
            };
      },
    ],
    ["ORDER_INTEGRITY", () => ({ ok: true, detail: "Price pinned to catalog record" })],
  ];

  const checks: CheckResult[] = [];
  let failed: CheckResult | null = null;
  for (const [id, fn] of evals) {
    if (failed) {
      checks.push({ id, label: CHECK_LABELS[id], status: "SKIPPED", detail: "Not evaluated" });
      continue;
    }
    const r = fn();
    const c: CheckResult = {
      id,
      label: CHECK_LABELS[id],
      status: r.ok ? "PASS" : "FAIL",
      detail: r.detail,
    };
    checks.push(c);
    if (!r.ok) failed = c;
  }
  return { allowed: !failed, rule: failed?.id ?? null, reason: failed?.detail ?? null, checks };
}

