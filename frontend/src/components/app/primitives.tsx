import { animate, motion, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { configQuery, type AgentStatus } from "@/lib/agentpay/api";

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      data-scroll-reveal
      initial={reduce ? false : { opacity: 0, y: 36 }}
      {...(reduce ? { animate: { opacity: 1, y: 0 } } : {})}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: reduce ? 0 : 0.75, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function GlassCard({ children, className, hover = true }: { children: ReactNode; className?: string; hover?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...(hover && !reduce ? { whileHover: { y: -3 } } : {})}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("glass rounded-xl transition-colors", hover && "purple-hover", className)}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <Reveal className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </Reveal>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-glass-border px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  COMPLETED: "bg-success/12 text-success border-success/25",
  RUNNING: "bg-primary/12 text-primary border-primary/25",
  BLOCKED: "bg-destructive/12 text-destructive border-destructive/25",
  FAILED: "bg-destructive/12 text-destructive border-destructive/25",
  WARNING: "bg-warning/12 text-warning border-warning/25",
  OVERRIDDEN: "bg-warning/12 text-warning border-warning/25",
  PENDING: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  MISSING: "bg-warning/12 text-warning border-warning/25",
  CONNECTED: "bg-success/12 text-success border-success/25",
  ERROR: "bg-destructive/12 text-destructive border-destructive/25",
};
export function StatusBadge({ status, className }: { status: AgentStatus | string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider", statusStyles[status] ?? statusStyles["PENDING"], className)}>
      <span className={cn("size-1.5 rounded-full bg-current", status === "RUNNING" && "animate-pulse")} />
      {status}
    </span>
  );
}

export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [text, setText] = useState(format(value));
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setText(format(value)); return; }
    const c = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setText(format(v)) });
    return () => c.stop();
  }, [inView, value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="tabular-nums">{text}</span>;
}

export function PulseDot({ tone = "success" }: { tone?: "success" | "warning" | "destructive" | "primary" }) {
  const c = { success: "bg-success", warning: "bg-warning", destructive: "bg-destructive", primary: "bg-primary" }[tone];
  return (
    <span className="relative flex size-2">
      <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", c)} />
      <span className={cn("relative inline-flex size-2 rounded-full", c)} />
    </span>
  );
}

export function NotConnectedNote({ children }: { children?: ReactNode }) {
  const { data: cfg } = useQuery(configQuery);
  const isConnected = cfg?.services?.paypal?.status === "connected" && cfg?.services?.serpapi?.status === "connected";

  if (isConnected) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
        <span className="mt-1.5"><PulseDot tone="success" /></span>
        <p className="text-muted-foreground">
          <span className="font-medium text-emerald-400">Sandbox connected &amp; operational. </span>
          {children ?? "PayPal Sandbox, SerpApi and Groq LPUs are connected. Real procurements and cryptographic audits active."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning/8 px-4 py-3 text-sm">
      <span className="mt-1.5"><PulseDot tone="warning" /></span>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Sandbox not connected. </span>
        {children ?? "Connect PayPal, SerpApi and Groq to run real procurements. Nothing here is simulated."}
      </p>
    </div>
  );
}

export function BudgetBar({ spent, reserved, limit }: { spent: number; reserved: number; limit: number }) {
  const pct = (n: number) => (limit > 0 ? Math.min(100, (n / limit) * 100) : 0);
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full bg-primary" initial={{ width: 0 }} whileInView={{ width: `${pct(spent)}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
        <motion.div className="h-full bg-warning" initial={{ width: 0 }} whileInView={{ width: `${pct(reserved)}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-primary" />Spent</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-warning" />Reserved</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-muted-foreground/30" />Remaining</span>
      </div>
    </div>
  );
}
