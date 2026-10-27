import { BookOpen, Github, Settings2 } from "lucide-react";
import { AgentPayMark } from "./Mark";
import type { AppConfig } from "@/lib/agentpay.functions";

const STATUS: Record<AppConfig["status"], { label: string; tone: string; dot: string }> = {
  DEMO: { label: "Demo sandbox mode", tone: "text-warning border-warning/40", dot: "bg-warning" },
  CONNECTED: {
    label: "Sandbox connected",
    tone: "text-verified border-verified/40",
    dot: "bg-verified",
  },
  CONFIG_REQUIRED: {
    label: "Sandbox configuration required",
    tone: "text-warning border-warning/40",
    dot: "bg-warning",
  },
  ERROR: {
    label: "Sandbox connection error",
    tone: "text-warning border-warning/40",
    dot: "bg-warning",
  },
};

export function EnvironmentStatus({ config }: { config: AppConfig | undefined }) {
  if (!config)
    return (
      <span className="meta rounded-sm border border-line px-2.5 py-1">Checking environment…</span>
    );
  const s = STATUS[config.status];
  return (
    <span
      role="status"
      title={config.message ?? undefined}
      className={`inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em] ${s.tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

export function AgentPayHeader({
  config,
  onSetup,
}: {
  config: AppConfig | undefined;
  onSetup: () => void;
}) {
  return (
    <header className="surface-navy-glass sticky top-0 z-40">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <AgentPayMark className="h-8 w-8 text-foreground" />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">AgentPay</div>
            <div className="text-xs text-muted-foreground">Autonomous AI Agent Commerce</div>
          </div>
        </div>
        <div className="order-3 w-full md:order-none md:ml-6 md:w-auto">
          <EnvironmentStatus config={config} />
        </div>
        <nav className="ml-auto flex items-center gap-1" aria-label="Developer">
          <button
            onClick={onSetup}
            className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <Settings2 className="h-4 w-4" />{" "}
            <span className="hidden sm:inline">Sandbox Setup</span>
          </button>
          <a
            href="https://developer.paypal.com/docs/checkout/standard/integrate/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Docs</span>
          </a>
          <a
            href="https://github.com/paypal/paypal-js"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Github className="h-4 w-4" /> <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
