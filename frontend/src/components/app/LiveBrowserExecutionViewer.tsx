import { useEffect, useState } from "react";
import {
  Globe,
  RefreshCw,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  Eye,
  Activity,
  Play,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LiveTaskData {
  taskId: string;
  workerId?: string;
  state: string;
  currentUrl?: string;
  currentAction?: string;
  browserProcessStatus?: string;
  lastScreenshot?: string | null;
  retryCount?: number;
  error?: any;
  logs?: Array<{
    timestamp: string;
    step: string;
    action?: string;
    workerId?: string;
    url?: string;
    details?: any;
  }>;
  updatedAt?: string;
}

export function LiveBrowserExecutionViewer({
  taskId,
  initialData,
  onClose,
  autoRefresh = true,
}: {
  taskId?: string | null;
  initialData?: LiveTaskData | null;
  onClose?: () => void;
  autoRefresh?: boolean;
}) {
  const [taskData, setTaskData] = useState<LiveTaskData | null>(initialData || null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

  // Poll live execution data for the active task
  useEffect(() => {
    if (!taskId || !autoRefresh) return;

    let isMounted = true;
    const fetchLiveState = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/browser/task/${taskId}/live`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setTaskData(data);
          }
        }
      } catch (_) {}
    };

    fetchLiveState();
    const interval = setInterval(fetchLiveState, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [taskId, autoRefresh]);

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    toast.info("Dispatching Harmless Browser Diagnostic Task...", {
      description: "Worker launching Chromium to verify navigation, DOM extraction & screenshot capture.",
    });

    try {
      const res = await fetch("http://localhost:5000/api/browser/diagnostic/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "example.com" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTaskData({
          taskId: data.taskId,
          workerId: data.workerId,
          state: data.state,
          currentUrl: data.url,
          currentAction: "Diagnostic Verification Complete",
          browserProcessStatus: "CONNECTED_VERIFIED",
          lastScreenshot: data.screenshot,
          logs: data.logs,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Browser Pipeline Verified Successfully!", {
          description: `Worker ${data.workerId} captured real viewport screenshot from ${data.url}`,
        });
      } else {
        toast.error("Diagnostic execution error: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      toast.error("Diagnostic connection failed: " + err.message);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const stateColors: Record<string, string> = {
    CREATED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    QUEUED: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    STARTING: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    BROWSER_CONNECTED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    NAVIGATING: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    EXECUTING: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    AWAITING_USER: "bg-amber-500/10 text-amber-300 border-amber-500/40",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    NEEDS_VERIFICATION: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    FAILED: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    CANCELLED: "bg-muted text-muted-foreground border-border",
  };

  const currentState = taskData?.state || "IDLE";
  const stateClass = stateColors[currentState] || "bg-muted text-foreground border-border";

  return (
    <div className="w-full rounded-2xl border border-glass-border bg-card/90 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Top Browser Window Chrome Frame */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Traffic light window controls */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="size-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Playwright Live Execution Stream</span>
            {taskData?.workerId && (
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                {taskData.workerId}
              </span>
            )}
          </div>
        </div>

        {/* Live URL Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-mono text-muted-foreground shadow-inner truncate">
            <Globe className="size-3.5 text-primary shrink-0" />
            <span className="truncate text-foreground font-medium">
              {taskData?.currentUrl || "about:blank"}
            </span>
          </div>
        </div>

        {/* Status Badge & Diagnostic Trigger */}
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider font-mono", stateClass)}>
            <span className="size-1.5 rounded-full bg-current animate-pulse" />
            {currentState}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRunningDiagnostic}
            onClick={handleRunDiagnostic}
            className="h-7 text-xs font-medium border-primary/40 hover:bg-primary/10 text-primary cursor-pointer flex items-center gap-1.5"
          >
            {isRunningDiagnostic ? (
              <>
                <RefreshCw className="size-3 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <Play className="size-3" /> Diagnostic Test
              </>
            )}
          </Button>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-xs text-muted-foreground">
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Main Viewport Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-glass-border">
        {/* Live Browser Screen Viewport (7 Cols) */}
        <div className="lg:col-span-7 p-4 bg-black/40 flex flex-col justify-center min-h-[340px]">
          {taskData?.lastScreenshot ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> Live Rendered Viewport Buffer
                </span>
                <span>Captured: {taskData.updatedAt ? new Date(taskData.updatedAt).toLocaleTimeString() : "Live"}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-glass-border shadow-2xl bg-black">
                <img
                  src={taskData.lastScreenshot}
                  alt="Live Browser Session Preview"
                  className="w-full h-auto max-h-[460px] object-contain rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-glow">
                <Activity className="size-8 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {taskData?.currentAction || "Awaiting Browser Task Dispatch"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {taskData
                    ? "Worker connected. Screen buffer will refresh as the worker navigates and interacts with the page."
                    : "Click 'Diagnostic Test' or dispatch any food order to stream live browser actions."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Real-Time Action Log Stream (5 Cols) */}
        <div className="lg:col-span-5 p-4 flex flex-col justify-between bg-surface-deep/60 min-h-[340px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground font-mono">
                <Terminal className="size-3.5 text-primary" />
                Action Audit Stream ({taskData?.logs?.length || 0})
              </div>
              {taskData?.taskId && (
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                  {taskData.taskId}
                </span>
              )}
            </div>

            {/* Event Log Items */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {taskData?.logs && taskData.logs.length > 0 ? (
                taskData.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border/50 bg-background/50 p-2.5 font-mono text-[11px] space-y-1 transition-all hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-bold text-primary flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-primary" />
                        {log.step}
                      </span>
                      <span className="text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {log.action && (
                      <p className="text-foreground text-xs font-sans font-medium">{log.action}</p>
                    )}
                    {log.url && log.url !== "about:blank" && (
                      <p className="text-[10px] text-muted-foreground truncate">URL: {log.url}</p>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre className="text-[10px] bg-muted/40 p-1.5 rounded text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-muted-foreground font-mono">
                  No execution events recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Footer */}
          <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-400" /> Zero-Trust Security Guard Active
            </span>
            <span>Refreshes: 1.5s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
