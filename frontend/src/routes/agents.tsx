import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Terminal, Wrench, ShieldCheck, CheckCircle2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AGENTS, getLatestTask, type AgentName, type AgentStatus } from "@/lib/agentpay/api";
import { AGENT_ICONS } from "@/components/app/agent-icons";
import { EmptyState, GlassCard, PageHeader, Reveal, StatusBadge } from "@/components/app/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agent Activity — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Trace every step of AgentPay's five specialized agents: tool calls, logs and decisions." },
      { property: "og:title", content: "Agent Activity — AgentPay 2.0" },
      { property: "og:description", content: "Multi-agent execution center for AgentPay procurements." },
    ],
  }),
  component: Agents,
});

const LEGEND = ["COMPLETED", "RUNNING", "BLOCKED", "WARNING", "PENDING", "OVERRIDDEN"];

function getAgentStatus(name: AgentName, task: any): AgentStatus {
  if (!task || !task.activityLogs) return "PENDING";
  const logs = task.activityLogs.filter((l: any) => l.agent === name);
  if (logs.length === 0) return "PENDING";
  if (logs.some((l: any) => l.status === "BLOCKED" || l.status === "FAILED")) return "BLOCKED";
  if (logs.some((l: any) => l.status === "RUNNING")) return "RUNNING";
  if (logs.some((l: any) => l.status === "COMPLETED")) return "COMPLETED";
  return "PENDING";
}

function Agents() {
  const [sel, setSel] = useState<AgentName>("Orchestrator");
  const { data: latestTask } = useQuery({ queryKey: ["latestTask"], queryFn: getLatestTask });

  const agent = AGENTS.find((a) => a.name === sel)!;
  const Icon = AGENT_ICONS[sel];

  const agentLogs = latestTask?.activityLogs?.filter((l: any) => l.agent === sel) || [];
  const status = getAgentStatus(sel, latestTask);

  const durationStr = latestTask?.completedAt && latestTask?.createdAt
    ? `${Math.max(1, Math.round((new Date(latestTask.completedAt).getTime() - new Date(latestTask.createdAt).getTime()) / 1000))}s`
    : latestTask
      ? "1.2s"
      : "—";

  const startedStr = latestTask?.createdAt
    ? new Date(latestTask.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div>
      <PageHeader
        eyebrow="Execution center"
        title="Multi-agent execution"
        description="Every event shown here comes from a real run. Start a procurement to see agents execute in real time."
        actions={<Button variant="brand" asChild><Link to="/procurement">New procurement</Link></Button>}
      />
      <Reveal className="mb-6 flex flex-wrap gap-2">
        {LEGEND.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </Reveal>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Reveal>
          <GlassCard hover={false} className="p-3">
            <ol className="relative">
              {AGENTS.map((a, i) => {
                const AIcon = AGENT_ICONS[a.name];
                const active = a.name === sel;
                const aStatus = getAgentStatus(a.name, latestTask);
                return (
                  <motion.li
                    key={a.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="relative"
                  >
                    {i < AGENTS.length - 1 && (
                      <span className="absolute left-[27px] top-12 h-[calc(100%-28px)] w-px bg-border" />
                    )}
                    <button
                      onClick={() => setSel(a.name)}
                      className={cn(
                        "relative flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                        active ? "bg-accent" : "hover:bg-muted"
                      )}
                    >
                      {active && (
                        <motion.span layoutId="agent-sel" className="absolute inset-0 rounded-lg ring-1 ring-primary/40" />
                      )}
                      <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-glass-border bg-background">
                        <AIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{a.name}</span>
                          <StatusBadge status={aStatus} />
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{a.steps.join(" · ")}</p>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </ol>
          </GlassCard>
        </Reveal>
        <Reveal delay={0.1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={sel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <GlassCard hover={false} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="grid size-11 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold">{agent.name}</h2>
                    <p className="text-sm text-muted-foreground">{agent.role}</p>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {agent.steps.map((s, idx) => {
                    const matchedLog = agentLogs[idx];
                    const stepStatus = matchedLog ? matchedLog.status.toLowerCase() : "idle";
                    return (
                      <div
                        key={s}
                        className="flex items-center justify-between rounded-lg border border-glass-border bg-glass px-3 py-2.5 text-sm"
                      >
                        <span>{s}</span>
                        <span className={cn(
                          "font-mono text-[10px]",
                          stepStatus === "completed" ? "text-emerald-400" :
                          stepStatus === "blocked" ? "text-destructive" :
                          stepStatus === "running" ? "text-primary" : "text-muted-foreground"
                        )}>
                          {stepStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <dl className="mt-6 grid grid-cols-3 gap-3 font-mono text-[11px]">
                  {[
                    ["Task ID", latestTask?.id ? `${latestTask.id.slice(0, 14)}...` : "—"],
                    ["Duration", durationStr],
                    ["Started", startedStr],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-muted px-3 py-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Wrench className="size-3.5" />Tool calls &amp; Decisions
                    </h3>
                    {agentLogs.length === 0 ? (
                      <EmptyState
                        icon={Wrench}
                        title="No tool calls"
                        description="Tool executions appear here during an active procurement run."
                      />
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {agentLogs.map((log: any) => (
                          <div
                            key={log.id}
                            className="rounded-lg border border-glass-border bg-glass/60 p-3 text-xs font-mono"
                          >
                            <div className="flex items-center justify-between text-muted-foreground mb-1">
                              <span className="font-semibold text-foreground">{log.action}</span>
                              <span className={cn(
                                "text-[10px] uppercase font-bold",
                                log.status === "COMPLETED" ? "text-emerald-400" :
                                log.status === "BLOCKED" ? "text-rose-400" : "text-amber-400"
                              )}>
                                {log.status}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-[11px] font-sans">{log.details}</p>
                            {log.data && (
                              <pre className="mt-1.5 overflow-x-auto rounded bg-surface-deep p-1.5 text-[10px] text-muted-foreground">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Terminal className="size-3.5" />Live Execution Logs
                    </h3>
                    <div className="h-[218px] overflow-y-auto rounded-xl border border-glass-border bg-surface-deep p-4 font-mono text-[11px] text-muted-foreground">
                      {agentLogs.length === 0 ? (
                        <>
                          <span className="text-primary">$</span> waiting for dispatch…
                        </>
                      ) : (
                        agentLogs.map((log: any, i: number) => (
                          <div key={i} className="mb-2 leading-relaxed">
                            <span className="text-emerald-400">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "00:00:00"}]</span>{" "}
                            <span className="text-primary font-semibold">[{log.agent}]</span>{" "}
                            <span className="text-foreground">{log.action}:</span> {log.details}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </Reveal>
      </div>
    </div>
  );
}
