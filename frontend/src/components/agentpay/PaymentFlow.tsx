import { motion, useReducedMotion } from "motion/react";
import { Bot, Check, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

const STAGES = [
  { label: "Reserving budget", icon: ShieldCheck },
  { label: "Creating PayPal order", icon: Wallet },
  { label: "Buyer approval", icon: Bot },
  { label: "Capture verified", icon: Check },
] as const;

/** Visual-only payment flow. `stage` is driven by real server state, or by a labelled simulation. */
export function PaymentFlow({
  stage,
  amount,
  simulated,
}: {
  stage: number;
  amount: number;
  simulated?: boolean;
}) {
  const reduce = useReducedMotion();
  const done = stage >= STAGES.length - 1;
  const pct = Math.min(1, stage / (STAGES.length - 1));

  return (
    <div className="glass-dark relative overflow-hidden rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="meta">Payment rail</span>
        {simulated && (
          <span className="font-mono text-[10px] tracking-wider text-warning">
            SIMULATED PREVIEW · NOTHING CHARGED
          </span>
        )}
      </div>

      <motion.div
        key={done ? "d" : "p"}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`mt-3 tabular font-mono text-4xl font-medium ${done ? "text-verified" : ""}`}
      >
        ${amount.toFixed(2)}
        <span className="ml-1 text-sm text-muted-foreground">USD</span>
      </motion.div>

      <div className="relative mt-6 px-4">
        <div className="absolute left-4 right-4 top-5 h-[2px] rounded bg-line" />
        <motion.div
          className="absolute left-4 top-5 h-[2px] rounded bg-warning"
          animate={{ width: `calc((100% - 2rem) * ${pct})` }}
          transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {!done && !reduce && (
          <motion.div
            className="absolute top-[14px] h-3 w-3 rounded-full bg-warning shadow-[0_0_16px_var(--warning)]"
            animate={{ left: [`calc(1rem + (100% - 2rem) * ${pct})`, `calc(1rem + (100% - 2rem) * ${Math.min(1, pct + 1 / 3)})`] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <ol className="relative flex justify-between">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const state = i < stage || done ? "done" : i === stage ? "active" : "wait";
            return (
              <li key={s.label} className="flex w-16 flex-col items-center gap-2 text-center">
                <motion.span
                  animate={
                    state === "active" && !reduce
                      ? { scale: [1, 1.12, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 1.2, repeat: state === "active" ? Infinity : 0 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    state === "done"
                      ? "border-verified bg-verified text-verified-foreground"
                      : state === "active"
                        ? "border-warning bg-background text-warning"
                        : "border-line bg-background text-muted-foreground"
                  }`}
                >
                  {state === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </motion.span>
                <span className="text-[10px] leading-tight text-muted-foreground">{s.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Plays the flow end-to-end for a demo preview. Purely visual, writes nothing. */
export function SimulatedPaymentFlow({ amount }: { amount: number }) {
  const [stage, setStage] = useState(0);
  const [runKey, setRunKey] = useState(0);
  useEffect(() => {
    setStage(0);
    const t = [1, 2, 3].map((s) => window.setTimeout(() => setStage(s), s * 1300));
    return () => t.forEach(clearTimeout);
  }, [runKey]);
  return (
    <div className="space-y-2">
      <PaymentFlow stage={stage} amount={amount} simulated />
      {stage >= 3 && (
        <button
          onClick={() => setRunKey((k) => k + 1)}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Replay animation
        </button>
      )}
    </div>
  );
}
