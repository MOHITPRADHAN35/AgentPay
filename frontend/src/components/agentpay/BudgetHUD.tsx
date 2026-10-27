import { motion } from "motion/react";
import { usd } from "./format";
import { AnimatedNumber } from "./primitives";

export type Budget = {
  dailyLimit: number;
  singleTransactionLimit: number;
  spentToday: number;
  reservedAmount: number;
  remainingBalance: number;
  currency: string;
};

export function BudgetAuthorizationHUD({
  budget,
  error,
}: {
  budget: Budget | undefined;
  error?: boolean;
}) {
  const b = budget;
  const spentPct = b ? Math.min(100, (b.spentToday / b.dailyLimit) * 100) : 0;
  const resPct = b ? Math.min(100 - spentPct, (b.reservedAmount / b.dailyLimit) * 100) : 0;
  const used = spentPct + resPct;
  const near = used >= 80;
  const singlePct = b ? (b.singleTransactionLimit / b.dailyLimit) * 100 : 35;

  const stat = (
    label: string,
    value: number | undefined,
    note?: string,
    tone = "",
    big = false,
  ) => (
    <div className="min-w-0">
      <div className="meta">{label}</div>
      <div
        className={`tabular mt-2 font-mono font-medium tracking-tight ${big ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"} ${tone}`}
      >
        {value === undefined ? "—" : <AnimatedNumber value={value} format={usd} />}
      </div>
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
    </div>
  );

  return (
    <section
      aria-labelledby="hud-title"
      className="surface-blue-glass relative overflow-hidden rounded-2xl px-6 py-7 md:px-9 md:py-8"
    >
      {/* Faint instrument grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--brand-white)_1px,transparent_1px),linear-gradient(90deg,var(--brand-white)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <div className="relative">
        <div className="mb-7 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="hud-title" className="font-display text-xl font-bold md:text-2xl">
            Financial authorization
          </h2>
          <span className="meta">
            {error ? "Budget unavailable" : "Live from server ledger · resets 00:00 UTC"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {stat(
            "Remaining authorization",
            b?.remainingBalance,
            b && b.reservedAmount > 0
              ? `${usd(b.reservedAmount)} reserved by pending orders`
              : "No pending reservations",
            near ? "text-warning" : "",
            true,
          )}
          {stat("Daily budget cap", b?.dailyLimit)}
          {stat("Spent today", b?.spentToday, "Verified captures only")}
          {stat("Single transaction limit", b?.singleTransactionLimit)}
        </div>

        <div className="mt-8">
          <div
            className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label="Daily budget utilization"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(used)}
          >
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${near ? "bg-warning" : "bg-foreground"}`}
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
            <motion.div
              className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,var(--brand-orange)_0_3px,transparent_3px_6px)]"
              initial={{ width: 0 }}
              animate={{ left: `${spentPct}%`, width: `${resPct}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
            {[singlePct, 80].map((p) => (
              <span
                key={p}
                className="absolute inset-y-0 w-0.5 bg-background"
                style={{ left: `${p}%` }}
                aria-hidden
              />
            ))}
          </div>
          <div className="relative mt-2 h-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="absolute left-0">0</span>
            <span className="absolute -translate-x-1/2" style={{ left: `${singlePct}%` }}>
              Single limit
            </span>
            <span className="absolute -translate-x-1/2" style={{ left: "80%" }}>
              80% warn
            </span>
            <span className="absolute right-0">{b ? usd(b.dailyLimit) : ""}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular font-mono text-foreground">{used.toFixed(1)}% used</span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2 w-3 rounded-sm bg-foreground" aria-hidden /> Consumed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2 w-3 rounded-sm bg-warning" aria-hidden /> Reserved
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2 w-3 rounded-sm bg-muted" aria-hidden /> Available
            </span>
            {near && <span className="font-medium text-warning">⚠ Approaching daily limit</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
