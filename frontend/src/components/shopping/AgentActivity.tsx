import { Bot, Shield, Search, BarChart3, DollarSign, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import type { AgentActivityEvent, AgentRole } from "../../types/agent";

interface AgentActivityProps {
  activityLogs: AgentActivityEvent[];
}

const AGENT_META: Record<AgentRole, { icon: any; color: string; bg: string }> = {
  Orchestrator: { icon: Bot, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  SecurityAgent: { icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  DiscoveryAgent: { icon: Search, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  ComparisonAgent: { icon: BarChart3, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
  BudgetAgent: { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" }
};

export function AgentActivity({ activityLogs }: AgentActivityProps) {
  if (!activityLogs || activityLogs.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Agent Execution Trace & Activity</h3>
            <p className="text-[11px] text-slate-400">Transparent, deterministic event stream emitted by specialized agents</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
          {activityLogs.length} Events Logged
        </span>
      </div>

      <div className="relative mt-4 space-y-3 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
        {activityLogs.map((log) => {
          const meta = AGENT_META[log.agent] || AGENT_META.Orchestrator;
          const Icon = meta.icon;

          return (
            <div key={log.id} className="relative flex items-start gap-3 pl-1.5">
              <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.bg} ${meta.color} shadow-sm`}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              <div className="flex-1 rounded-xl border border-white/5 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{log.agent}</span>
                    <span className="text-[11px] text-slate-500">•</span>
                    <span className="text-xs font-medium text-slate-300">{log.action}</span>
                  </div>

                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                      log.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : log.status === "BLOCKED" || log.status === "FAILED"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-indigo-500/20 text-indigo-300"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-300">{log.details}</p>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Task: {log.taskId.slice(0, 16)}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

