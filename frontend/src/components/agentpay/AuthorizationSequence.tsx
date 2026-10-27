import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CheckResult } from "@/lib/policy";

export type FramePhase =
  "idle" | "requested" | "verifying" | "verified" | "blocked" | "completed" | "failed";
export type DisplayStatus = "PENDING" | "VERIFYING" | "VERIFIED" | "BLOCKED" | "SKIPPED";

const PHASE_LABEL: Record<FramePhase, string[]> = {
  idle: ["AWAITING PROCUREMENT REQUEST"],
  requested: ["REQUEST RECEIVED", "AGENT INITIALIZED", "POLICY ENGINE STANDBY"],
  verifying: ["POLICY VERIFICATION IN PROGRESS"],
  verified: ["POLICY VERIFICATION COMPLETE", "TRANSACTION WITHIN AUTHORIZED LIMITS"],
  blocked: ["TRANSACTION BLOCKED"],
  completed: ["PAYMENT CAPTURE VERIFIED"],
  failed: ["AUTHORIZATION HALTED"],
};

/** Face-ID-inspired frame. Purely visual: no camera, no biometrics. */
export function AuthorizationFrame({ phase }: { phase: FramePhase }) {
  const reduce = useReducedMotion();
  const scanning = phase === "requested" || phase === "verifying";
  const tone =
    phase === "blocked" || phase === "failed"
      ? "var(--warning)"
      : phase === "verified" || phase === "completed"
        ? "var(--verified)"
        : phase === "idle"
          ? "var(--line-strong)"
          : "var(--signal)";
  const resolved = phase === "verified" || phase === "completed";
  const corners = ["M4 22V4h18", "M98 4h18v18", "M116 98v18H98", "M22 116H4V98"];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        {corners.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            stroke={tone}
            strokeWidth={2}
            strokeLinecap="square"
            initial={false}
            animate={{
              opacity: phase === "idle" ? 0.5 : 1,
              pathLength: 1,
              x: scanning && !reduce ? [0, i % 3 === 0 ? -2 : 2, 0] : 0,
              y: scanning && !reduce ? [0, i < 2 ? -2 : 2, 0] : 0,
            }}
            transition={{
              x: {
                repeat: scanning ? Infinity : 0,
                duration: 1.6,
                delay: i * 0.12,
                ease: "easeInOut",
              },
              y: {
                repeat: scanning ? Infinity : 0,
                duration: 1.6,
                delay: i * 0.12,
                ease: "easeInOut",
              },
              opacity: { duration: 0.4 },
            }}
          />
        ))}

        {/* Outer orbit: rotates only while an operation is active */}
        <motion.circle
          cx={60}
          cy={60}
          r={52}
          stroke={tone}
          strokeWidth={0.8}
          strokeDasharray="2 6"
          style={{ originX: "60px", originY: "60px" }}
          initial={false}
          animate={{
            rotate: scanning && !reduce ? 360 : 0,
            opacity: phase === "idle" ? 0.25 : resolved ? 0.6 : 0.8,
          }}
          transition={{
            rotate: scanning
              ? { repeat: Infinity, duration: 6, ease: "linear" }
              : { duration: 0.8 },
            opacity: { duration: 0.4 },
          }}
        />
        {resolved && !reduce && (
          <motion.circle
            cx={60}
            cy={60}
            r={40}
            stroke={tone}
            strokeWidth={1}
            initial={{ scale: 0.8, opacity: 0.9 }}
            animate={{ scale: 1.5, opacity: 0 }}
            style={{ originX: "60px", originY: "60px" }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        )}
        {/* Segmented ring */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
          const r1 = 38;
          const r2 = 42;
          return (
            <motion.line
              key={i}
              x1={(60 + Math.cos(a) * r1).toFixed(2)}
              y1={(60 + Math.sin(a) * r1).toFixed(2)}
              x2={(60 + Math.cos(a) * r2).toFixed(2)}
              y2={(60 + Math.sin(a) * r2).toFixed(2)}
              stroke={tone}
              strokeWidth={1.4}
              initial={false}
              animate={{
                opacity:
                  phase === "idle" ? 0.15 : resolved ? 0.9 : scanning ? [0.15, 0.9, 0.15] : 0.4,
              }}
              transition={
                scanning && !reduce
                  ? { repeat: Infinity, duration: 1.8, delay: (i / 24) * 1.8 }
                  : { duration: 0.5, delay: resolved ? i * 0.015 : 0 }
              }
            />
          );
        })}

        {/* Glyph: scattered dots resolve into a precise shield-check */}
        <motion.path
          d="M60 38l16 7v12c0 10-7 17-16 21-9-4-16-11-16-21V45l16-7z"
          stroke={tone}
          strokeWidth={1.6}
          initial={false}
          animate={{
            pathLength: resolved || phase === "blocked" ? 1 : phase === "idle" ? 0.15 : 0.55,
            opacity: phase === "idle" ? 0.4 : 1,
          }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <AnimatePresence>
          {resolved && (
            <motion.path
              key="check"
              d="M52 58l6 6 11-12"
              stroke={tone}
              strokeWidth={2.2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.5, delay: 0.3 }}
            />
          )}
          {phase === "blocked" && (
            <motion.path
              key="x"
              d="M53 51l14 14M67 51L53 65"
              stroke={tone}
              strokeWidth={2.2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.4 }}
            />
          )}
        </AnimatePresence>
      </svg>

      {scanning && !reduce && (
        <motion.div
          className="scanline absolute left-[8%] right-[8%] h-px"
          initial={{ top: "10%" }}
          animate={{ top: ["10%", "90%", "10%"] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          aria-hidden
        />
      )}
    </div>
  );
}

export function PhaseLabels({ phase }: { phase: FramePhase }) {
  return (
    <div className="min-h-[54px] text-center" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {PHASE_LABEL[phase].map((l, i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.25 }}
              className={`font-mono text-[11px] tracking-[0.14em] ${
                phase === "blocked" || phase === "failed"
                  ? "text-warning"
                  : i === 0
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {l}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const STATUS_STYLE: Record<DisplayStatus, string> = {
  PENDING: "text-muted-foreground",
  VERIFYING: "text-signal",
  VERIFIED: "text-verified",
  BLOCKED: "text-warning",
  SKIPPED: "text-muted-foreground/60",
};
const STATUS_GLYPH: Record<DisplayStatus, string> = {
  PENDING: "○",
  VERIFYING: "◐",
  VERIFIED: "✓",
  BLOCKED: "✕",
  SKIPPED: "–",
};

export function PolicyVerificationChecklist({
  checks,
  statuses,
  simulated,
}: {
  checks: CheckResult[];
  statuses: DisplayStatus[];
  simulated: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="meta">Policy checks</span>
        {simulated && (
          <span className="rounded-sm border border-warning/40 px-1.5 py-0.5 font-mono text-[10px] text-warning">
            SIMULATED · DEMO
          </span>
        )}
      </div>
      <ul className="space-y-0.5" role="list">
        {checks.map((c, i) => {
          const s = statuses[i] ?? "PENDING";
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[16px_1fr_auto] items-start gap-2 py-1.5"
            >
              <span className={`font-mono text-xs ${STATUS_STYLE[s]}`} aria-hidden>
                {STATUS_GLYPH[s]}
              </span>
              <span className="min-w-0">
                <span className="block text-sm">{c.label}</span>
                {(s === "VERIFIED" || s === "BLOCKED") && (
                  <span
                    className={`block text-xs ${s === "BLOCKED" ? "text-warning" : "text-muted-foreground"}`}
                  >
                    {c.detail}
                  </span>
                )}
              </span>
              <span className={`font-mono text-[10px] tracking-wider ${STATUS_STYLE[s]}`}>{s}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
