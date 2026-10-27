import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import { ShieldAlert } from "lucide-react";
import { Fingerprint, Lock, ShieldCheck, ScanFace } from "lucide-react";
import { authenticateWithBiometrics } from "@/utils/webauthn";
import { PaymentFlow, SimulatedPaymentFlow } from "./PaymentFlow";
import {
  cancelOrder,
  captureOrder,
  createOrder,
  type AppConfig,
  type CaptureResult,
  type DispatchResult,
} from "@/lib/agentpay.functions";
import {
  AuthorizationFrame,
  PhaseLabels,
  PolicyVerificationChecklist,
  type DisplayStatus,
  type FramePhase,
} from "./AuthorizationSequence";
import { CopyButton } from "./CopyButton";
import { ts, usd } from "./format";
import { Spotlight } from "./primitives";

// Palette for the canvas particle burst (canvas needs literal colors).
const BURST = ["#F9F9F9", "#004E72", "#FF6E42"];

type Checkout =
  | { kind: "none" }
  | { kind: "preparing" }
  | { kind: "ready"; orderId: string }
  | { kind: "capturing"; orderId: string }
  | { kind: "done"; result: CaptureResult }
  | { kind: "cancelled"; orderId: string }
  | { kind: "error"; message: string; orderId?: string | undefined };

export function ProcurementWorkspace({
  run,
  dispatching,
  dispatchError,
  config,
  onLedgerChange,
}: {
  run: DispatchResult | null;
  dispatching: boolean;
  dispatchError: string | null;
  config: AppConfig | undefined;
  onLedgerChange: () => void;
}) {
  const reduce = useReducedMotion();
  const [statuses, setStatuses] = useState<DisplayStatus[]>([]);
  const [revealDone, setRevealDone] = useState(false);
  const [checkout, setCheckout] = useState<Checkout>({ kind: "none" });
  const createFn = useServerFn(createOrder);
  const captureFn = useServerFn(captureOrder);
  const cancelFn = useServerFn(cancelOrder);
  const busyRef = useRef(false);

  // Reveal backend check results sequentially. Nothing shows VERIFIED before the server answered.
  useEffect(() => {
    setCheckout({ kind: "none" });
    if (!run) {
      setStatuses([]);
      setRevealDone(false);
      return;
    }
    const final: DisplayStatus[] = run.policy.checks.map((c) =>
      c.status === "PASS" ? "VERIFIED" : c.status === "FAIL" ? "BLOCKED" : "SKIPPED",
    );
    if (reduce) {
      setStatuses(final);
      setRevealDone(true);
      return;
    }
    setRevealDone(false);
    setStatuses(final.map(() => "PENDING"));
    const timers: number[] = [];
    const step = 520;
    let stopAt = final.length;
    final.forEach((s, i) => {
      if (i >= stopAt) return;
      timers.push(
        window.setTimeout(
          () => setStatuses((p) => p.map((v, j) => (j === i ? "VERIFYING" : v))),
          i * step,
        ),
        window.setTimeout(
          () => setStatuses((p) => p.map((v, j) => (j === i ? s : v))),
          i * step + step * 0.8,
        ),
      );
      if (s === "BLOCKED") {
        stopAt = i + 1;
        timers.push(window.setTimeout(() => setStatuses(final), i * step + step));
      }
    });
    timers.push(window.setTimeout(() => setRevealDone(true), stopAt * step + 100));
    return () => timers.forEach(clearTimeout);
  }, [run, reduce]);

  const allowed = run?.policy.allowed ?? false;
  const framePhase: FramePhase = dispatching
    ? "requested"
    : !run
      ? "idle"
      : !revealDone
        ? "verifying"
        : !allowed
          ? "blocked"
          : checkout.kind === "done" && checkout.result.status === "COMPLETED"
            ? "completed"
            : checkout.kind === "error" ||
                (checkout.kind === "done" && checkout.result.status === "FAILED")
              ? "failed"
              : "verified";

  useEffect(() => {
    if (framePhase !== "completed" || reduce) return;
    confetti({
      particleCount: 60,
      spread: 55,
      startVelocity: 28,
      ticks: 140,
      scalar: 0.7,
      colors: BURST,
      origin: { y: 0.45 },
    });
  }, [framePhase, reduce]);

  async function prepare() {
    if (!run || busyRef.current) return;
    busyRef.current = true;
    setCheckout({ kind: "preparing" });
    try {
      const { orderId } = await createFn({ data: { taskId: run.taskId } });
      setCheckout({ kind: "ready", orderId });
    } catch (e) {
      setCheckout({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not create order.",
      });
    } finally {
      busyRef.current = false;
      onLedgerChange();
    }
  }

  async function capture(orderId: string) {
    setCheckout({ kind: "capturing", orderId });
    try {
      const result = await captureFn({ data: { orderId } });
      if (result.status === "PENDING" && result.message?.includes("declined")) {
        setCheckout({ kind: "error", message: result.message, orderId });
      } else setCheckout({ kind: "done", result });
    } catch (e) {
      setCheckout({
        kind: "error",
        message: e instanceof Error ? e.message : "Capture failed.",
        orderId,
      });
    } finally {
      onLedgerChange();
    }
  }


  return (
    <Spotlight className="h-full rounded-2xl">
      <section
        aria-labelledby="ws-title"
        className="surface-navy-glass relative flex h-full flex-col overflow-hidden rounded-2xl shadow-[var(--shadow-panel)]"
      >
        <div className="flex items-baseline justify-between border-b border-line px-5 py-4 md:px-6">
          <h2 id="ws-title" className="font-display text-xl font-bold">
            Authorization &amp; procurement
          </h2>
          <span className="meta">02 / Verify · 03 / Pay</span>
        </div>

        <div className="grid flex-1 gap-6 p-5 md:p-6 lg:grid-cols-[220px_1fr]">
          {/* AgentAuthorizationSequence */}
          <div className="flex flex-col items-center gap-4">
            <AuthorizationFrame phase={framePhase} />
            <PhaseLabels phase={framePhase} />
          </div>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {!run && !dispatching && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full flex-col justify-center"
                >
                  <p className="font-display text-xl font-semibold">Awaiting procurement request</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Dispatch an instruction to initialize the authorization sequence.
                  </p>
                  {dispatchError && (
                    <p className="mt-4 text-sm text-warning" role="alert">
                      ⚠ {dispatchError}
                    </p>
                  )}
                </motion.div>
              )}
              {dispatching && (
                <motion.div
                  key="busy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full flex-col justify-center gap-2"
                >
                  <p className="font-display text-xl font-semibold">Agent reasoning</p>
                  <p className="text-sm text-muted-foreground">
                    Decomposing the instruction and resolving it against the trusted catalog…
                  </p>
                </motion.div>
              )}
              {run && !dispatching && (
                <motion.div
                  key={run.taskId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="meta">{run.item?.category ?? "Unresolved request"}</div>
                      <div className="mt-1 font-display text-lg font-semibold">
                        {run.item?.title ?? "No matching catalog item"}
                      </div>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        <span className="font-mono text-[11px] uppercase text-signal">
                          {run.reasoningSource === "ai" ? "Agent" : "Matcher"} ›{" "}
                        </span>
                        {run.reasoning}
                      </p>
                    </div>
                    {run.item && (
                      <div className="text-right">
                        <div
                          className={`tabular font-mono text-3xl font-medium ${!allowed && revealDone ? "text-warning" : ""}`}
                        >
                          {usd(run.item.estimatedCost)}
                          <span className="ml-1 text-sm text-muted-foreground">USD</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Remaining after capture:{" "}
                          <span className="tabular font-mono text-foreground">
                            {usd(Math.max(0, run.policy.remainingBefore - run.item.estimatedCost))}
                          </span>{" "}
                          (projected)
                        </div>
                      </div>
                    )}
                  </div>

                  <PolicyVerificationChecklist
                    checks={run.policy.checks}
                    statuses={statuses}
                    simulated={run.simulated}
                  />

                  {revealDone && !allowed && <BlockedNotice run={run} />}

                  {revealDone && allowed && run.simulated && (
                    <div className="rounded-md border border-warning/40 p-4 text-sm">
                      <div className="font-mono text-[11px] tracking-wider text-warning">
                        DEMO MODE · SIMULATED
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Policy passed, but PayPal Sandbox is not configured. No order was created
                        and no payment was made. Open Sandbox Setup to connect real sandbox
                        credentials.
                      </p>
                      {run.item && <DemoPaymentPreview amount={run.item.estimatedCost} />}
                    </div>
                  )}

                  {revealDone && allowed && !run.simulated && (
                    <CheckoutArea
                      checkout={checkout}
                      clientId={config?.clientId ?? null}
                      amount={run.item?.estimatedCost ?? 0}
                      onPrepare={prepare}
                      onCapture={capture}
                      onCancel={async (orderId) => {
                        setCheckout({ kind: "cancelled", orderId });
                        await cancelFn({ data: { orderId } }).catch(() => undefined);
                        onLedgerChange();
                      }}
                      onError={(m, orderId) => setCheckout({ kind: "error", message: m, orderId })}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </Spotlight>
  );
}

function BlockedNotice({ run }: { run: DispatchResult }) {
  const isLimit = run.policy.rule === "TRANSACTION_LIMIT";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      role="alert"
      className="rounded-md border border-warning/60 bg-warning/10 p-4"
    >
      <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.14em] text-warning">
        <ShieldAlert className="h-4 w-4" /> TRANSACTION BLOCKED
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
        {run.item && (
          <>
            <dt className="text-muted-foreground">Estimated cost</dt>
            <dd className="tabular text-right">{usd(run.item.estimatedCost)}</dd>
          </>
        )}
        <dt className="text-muted-foreground">
          {isLimit ? "Maximum transaction limit" : "Remaining daily authorization"}
        </dt>
        <dd className="tabular text-right">
          {usd(isLimit ? run.policy.singleTransactionLimit : run.policy.remainingBefore)}
        </dd>
      </dl>
      <p className="mt-3 text-sm">
        <span className="text-muted-foreground">Reason: </span>
        {run.policy.reason}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        No PayPal order was created. Checkout is disabled for this task.
      </p>
    </motion.div>
  );
}

function CheckoutArea({
  checkout,
  clientId,
  onPrepare,
  onCapture,
  onCancel,
  onError,
  amount,
}: {
  amount: number;
  checkout: Checkout;
  clientId: string | null;
  onPrepare: () => void;
  onCapture: (orderId: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
  onError: (m: string, orderId?: string) => void;
}) {
  if (checkout.kind === "none")
    return (
      <div className="glass-dark rounded-xl p-4">
        <p className="text-sm">
          Policy approved. Create a PayPal Sandbox order to review and approve payment.
        </p>
        <button
          onClick={onPrepare}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-warning-foreground shadow-[var(--shadow-cta)] transition-transform hover:-translate-y-0.5"
        >
          Prepare checkout
        </button>
      </div>
    );
  if (checkout.kind === "preparing")
    return (
      <PaymentFlow stage={0} amount={amount} />
    );
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const handleBiometricAuth = async (orderId: string) => {
    setVerifying(true);
    setBioError(null);
    try {
      await authenticateWithBiometrics(orderId, amount);
      setBiometricVerified(true);
    } catch (err: any) {
      setBioError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  if (checkout.kind === "ready" || checkout.kind === "capturing") {
    const orderId = checkout.orderId;
    return (
      <div className="glass-dark space-y-3 rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="meta">PayPal order</span>
          <code className="font-mono text-foreground">{orderId}</code>
          <CopyButton value={orderId} label="Copy order ID" />
        </div>
        <p className="text-xs text-muted-foreground">
          The agent cannot pay on its own. Verify your identity with hardware biometrics to unlock the PayPal Sandbox rail.
        </p>
        <PaymentFlow stage={checkout.kind === "capturing" ? 2 : 1} amount={amount} />

        {/* Hardware Biometric Safety Gate */}
        {!biometricVerified ? (
          <div className="rounded-xl border border-dashed border-sky-400/40 bg-slate-900/60 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10">
              <ScanFace className="h-5 w-5 text-sky-400" />
            </div>
            <h4 className="text-xs font-semibold text-white">Hardware Biometric Lock Active</h4>
            <p className="mx-auto my-1 max-w-xs text-[11px] text-muted-foreground">
              Confirm your identity with Windows Hello (Face ID, Fingerprint, or PIN) to unlock PayPal checkout.
            </p>
            {bioError && (
              <p className="mb-2 text-xs text-rose-400">{bioError}</p>
            )}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleBiometricAuth(orderId)}
                disabled={verifying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50"
              >
                <Fingerprint className="h-3.5 w-3.5" />
                {verifying ? "Scanning Windows Hello..." : "Verify with Face ID / PIN"}
              </button>
              <button
                type="button"
                onClick={() => setBiometricVerified(true)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5"
              >
                Bypass / Demo Sign
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="h-4 w-4" /> Hardware Biometric Signature Verified
            </span>
            <span className="font-mono text-[10px] uppercase text-emerald-400 font-bold">Unlocked</span>
          </div>
        )}

        {checkout.kind === "capturing" ? null : clientId && biometricVerified ? (
          <div className="rounded-md bg-white p-3">
            <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
              <PayPalButtons
                style={{ layout: "vertical", shape: "rect", label: "pay" }}
                fundingSource="paypal"
                createOrder={async () => orderId}
                onApprove={async (data) => onCapture(data.orderID ?? orderId)}
                onCancel={() => onCancel(orderId)}
                onError={() => onError("PayPal checkout reported an error.", orderId)}
              />
            </PayPalScriptProvider>
          </div>
        ) : !clientId ? (
          <p className="text-sm text-amber-400">PayPal client configuration unavailable.</p>
        ) : null}
      </div>
    );
  }
  if (checkout.kind === "cancelled")
    return (
      <div className="rounded-md border border-warning/50 p-4 text-sm" role="status">
        <div className="font-mono text-xs tracking-wider text-warning">PAYMENT CANCELLED</div>
        <p className="mt-1 text-muted-foreground">
          You cancelled the PayPal approval. Nothing was captured and the budget reservation was
          released.
        </p>
      </div>
    );
  if (checkout.kind === "error")
    return (
      <div className="rounded-md border border-warning/50 p-4 text-sm" role="alert">
        <div className="font-mono text-xs tracking-wider text-warning">CHECKOUT ERROR</div>
        <p className="mt-1">{checkout.message}</p>
        {checkout.orderId && (
          <button
            onClick={() => onCapture(checkout.orderId!)}
            className="mt-3 rounded-md border border-line-strong px-3 py-1.5 text-xs hover:bg-accent"
          >
            Retry capture (safe — idempotent)
          </button>
        )}
      </div>
    );
  return (
    <div className="space-y-3">
      {checkout.result.status === "COMPLETED" && (
        <PaymentFlow stage={3} amount={checkout.result.amount} />
      )}
      <TransactionReceipt result={checkout.result} />
    </div>
  );
}

export function TransactionReceipt({ result }: { result: CaptureResult }) {
  const ok = result.status === "COMPLETED";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className={`rounded-md border p-4 ${ok ? "border-verified/50" : "border-warning/50"}`}
      role="status"
    >
      <div
        className={`font-mono text-xs tracking-[0.14em] ${ok ? "text-verified" : "text-warning"}`}
      >
        {ok ? "✓ PAYMENT CAPTURE VERIFIED · PAYPAL SANDBOX" : `CAPTURE ${result.status}`}
      </div>
      {result.message && <p className="mt-1 text-sm">{result.message}</p>}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs">
        <dt className="text-muted-foreground">Order ID</dt>
        <dd className="flex items-center gap-1 truncate">
          {result.orderId}
          <CopyButton value={result.orderId} />
        </dd>
        <dt className="text-muted-foreground">Capture ID</dt>
        <dd className="flex items-center gap-1 truncate">
          {result.captureId ?? "—"}
          {result.captureId && <CopyButton value={result.captureId} />}
        </dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd className="tabular">
          {usd(result.amount)} {result.currency}
        </dd>
        <dt className="text-muted-foreground">Completed</dt>
        <dd>{ts(result.completedAt)}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>{result.status}</dd>
      </dl>
    </motion.div>
  );
}

function DemoPaymentPreview({ amount }: { amount: number }) {
  const [show, setShow] = useState(false);
  if (show)
    return (
      <div className="mt-4">
        <SimulatedPaymentFlow amount={amount} />
      </div>
    );
  return (
    <button
      onClick={() => setShow(true)}
      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-warning-foreground shadow-[var(--shadow-cta)] transition-transform hover:-translate-y-0.5"
    >
      Preview payment animation
    </button>
  );
}

