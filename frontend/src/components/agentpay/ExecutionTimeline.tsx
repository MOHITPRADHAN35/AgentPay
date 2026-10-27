export type StepState = "todo" | "active" | "done" | "failed" | "skipped";

const STEPS = [
  "Request parsed",
  "Procurement plan generated",
  "Spending policy verified",
  "PayPal order created",
  "User authorization",
  "Payment capture verified",
];

export function ExecutionTimeline({ states }: { states: StepState[] }) {
  return (
    <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
      {STEPS.map((label, i) => {
        const s = states[i] ?? "todo";
        const tone =
          s === "done"
            ? "text-verified"
            : s === "active"
              ? "text-signal"
              : s === "failed"
                ? "text-warning"
                : "text-muted-foreground";
        const word = {
          todo: "Waiting",
          active: "In progress",
          done: "Done",
          failed: "Stopped",
          skipped: "Not run",
        }[s];
        return (
          <li key={label} className="flex items-center gap-3 bg-surface px-3 py-2.5">
            <span className={`tabular font-mono text-xs ${tone}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-xs uppercase tracking-wide ${s === "todo" || s === "skipped" ? "text-muted-foreground" : "text-foreground"}`}
            >
              {label}
            </span>
            <span className={`font-mono text-[10px] ${tone}`}>{word}</span>
          </li>
        );
      })}
    </ol>
  );
}
