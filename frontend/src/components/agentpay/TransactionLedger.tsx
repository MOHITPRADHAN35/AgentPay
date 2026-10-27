import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, Link2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { verifyChain, type LedgerRow } from "@/lib/agentpay.functions";
import { CopyButton } from "./CopyButton";
import { ts, usd } from "./format";

const TONE: Record<LedgerRow["status"], string> = {
  COMPLETED: "text-verified border-verified/40",
  PENDING: "text-signal border-signal/40",
  FAILED: "text-warning border-warning/40",
  CANCELLED: "text-muted-foreground border-line-strong",
};

function Status({ s }: { s: LedgerRow["status"] }) {
  return (
    <span
      className={`inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wider ${TONE[s]}`}
    >
      {s}
    </span>
  );
}

const short = (v: string | null) =>
  v ? (v.length > 14 ? `${v.slice(0, 6)}…${v.slice(-5)}` : v) : "—";

export function TransactionLedger({
  rows,
  loading,
}: {
  rows: LedgerRow[] | undefined;
  loading: boolean;
}) {
  const [open, setOpen] = useState<LedgerRow | null>(null);
  const verifyFn = useServerFn(verifyChain);
  const [chain, setChain] = useState<{
    valid: boolean;
    records: number;
    reason: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  return (
    <section aria-labelledby="ledger-title" className="panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-6">
        <div>
          <h2 id="ledger-title" className="font-display text-xl font-bold">
            Transaction ledger
          </h2>
          <p className="text-xs text-muted-foreground">
            PayPal Sandbox records · tamper-evident SHA-256 audit chain
          </p>
        </div>
        <div className="flex items-center gap-3">
          {chain && (
            <span
              className={`font-mono text-[11px] ${chain.valid ? "text-verified" : "text-warning"}`}
              role="status"
            >
              {chain.valid
                ? `✓ Chain intact · ${chain.records} records`
                : `✕ Chain broken · ${chain.reason}`}
            </span>
          )}
          <button
            disabled={checking}
            onClick={async () => {
              setChecking(true);
              try {
                setChain(await verifyFn());
              } finally {
                setChecking(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
          >
            <Link2 className="h-3.5 w-3.5" /> {checking ? "Verifying…" : "Verify audit chain"}
          </button>
          <span className="rounded-sm bg-secondary px-2 py-1 font-mono text-[10px] tracking-wider text-secondary-foreground">
            SANDBOX
          </span>
        </div>
      </div>

      {loading ? (
        <p className="px-6 py-10 text-sm text-muted-foreground">Loading ledger…</p>
      ) : !rows?.length ? (
        <div className="px-6 py-12 text-center">
          <p className="font-medium">No transactions recorded</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Records appear here only after a policy-approved PayPal Sandbox order is created. Demo
            runs are never recorded.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  {[
                    "Timestamp",
                    "Description",
                    "PayPal order ID",
                    "Capture ID",
                    "Amount",
                    "Status",
                    "",
                  ].map((h) => (
                    <th key={h} className="meta px-6 py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-line transition-colors hover:bg-accent/30"
                  >
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-muted-foreground">
                      {ts(r.createdAt)}
                    </td>
                    <td className="px-6 py-3">{r.description}</td>
                    <td className="px-6 py-3 font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        {short(r.orderId)}
                        {r.orderId && <CopyButton value={r.orderId} />}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        {short(r.captureId)}
                        {r.captureId && <CopyButton value={r.captureId} />}
                      </span>
                    </td>
                    <td className="tabular px-6 py-3 text-right font-mono">{usd(r.amount)}</td>
                    <td className="px-6 py-3">
                      <Status s={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setOpen(r)}
                        aria-label={`Inspect ${r.description}`}
                        className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-line md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setOpen(r)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{r.description}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {ts(r.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular font-mono text-sm">{usd(r.amount)}</div>
                    <Status s={r.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="liquid-glass w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.description}</SheetTitle>
                <SheetDescription>PayPal Sandbox transaction record</SheetDescription>
              </SheetHeader>
              <dl className="mt-6 space-y-4 px-4 text-sm">
                {(
                  [
                    ["Status", <Status key="s" s={open.status} />],
                    [
                      "Amount",
                      <span key="a" className="tabular font-mono">
                        {usd(open.amount)} {open.currency}
                      </span>,
                    ],
                    ["Catalog SKU", open.sku],
                    ["Created", ts(open.createdAt)],
                    ["Completed", ts(open.completedAt)],
                    ["PayPal order ID", open.orderId],
                    ["Capture ID", open.captureId],
                    ["Record ID", open.id],
                    ["Record hash", open.hash],
                    ["Previous hash", open.prevHash ?? "GENESIS"],
                    ["Note", open.failureReason],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="meta">{k}</dt>
                    <dd className="mt-1 flex items-start gap-1 break-all font-mono text-xs">
                      {v ?? "—"}
                      {typeof v === "string" && v.length > 12 && <CopyButton value={v} />}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 px-4 text-xs text-muted-foreground">
                The hash covers record ID, task, SKU, amount, currency, creation time and the
                previous record's hash. It makes edits to those fields detectable; it does not make
                the database immutable.
              </p>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
