import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpDown, Copy, Download, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { transactionsQuery, type Transaction } from "@/lib/agentpay/api";
import { formatUSD } from "@/lib/agentpay/policy";
import { EmptyState, GlassCard, PageHeader, Reveal, StatusBadge } from "@/components/app/primitives";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Every PayPal and UPI authorized purchase made by AgentPay, with order and capture IDs." },
      { property: "og:title", content: "Transactions — AgentPay 2.0" },
      { property: "og:description", content: "AgentPay transaction ledger." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(transactionsQuery),
  component: Transactions,
});

function CopyId({ v }: { v: string | null }) {
  if (!v) return <span className="text-muted-foreground">—</span>;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(v);
        toast.success("Copied to clipboard");
      }}
      className="inline-flex items-center gap-1 hover:text-primary font-mono text-xs cursor-pointer"
    >
      {v.slice(0, 12)}…<Copy className="size-3" />
    </button>
  );
}

function Transactions() {
  const { data } = useSuspenseQuery(transactionsQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<keyof Transaction>("createdAt");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [open, setOpen] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    let res = status === "all" ? data : data.filter((t) => t.status === status);
    if (q.trim()) {
      const query = q.toLowerCase();
      res = res.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.merchant.toLowerCase().includes(query) ||
          t.sku.toLowerCase().includes(query) ||
          t.paypalOrderId.toLowerCase().includes(query) ||
          (t.captureId && t.captureId.toLowerCase().includes(query))
      );
    }
    return [...res].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null) return sortDesc ? 1 : -1;
      if (valB == null) return sortDesc ? -1 : 1;
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [data, status, q, sortKey, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function handleSort(key: keyof Transaction) {
    if (sortKey === key) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function exportCsv() {
    const head = ["Date", "Item", "SKU", "Merchant", "Amount", "Currency", "PayPal/UPI Order ID", "Capture ID", "Status"];
    const lines = data.map((t) =>
      [t.createdAt, t.description, t.sku, t.merchant, t.amount, t.currency, t.paypalOrderId, t.captureId ?? "", t.status]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(",")
    );
    const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "agentpay-transactions.csv" }).click();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Ledger"
        title="Transactions"
        description="Every payment authorized and captured through PayPal Sandbox or UPI Mobile Gateway is cryptographically recorded here."
        actions={
          <Button variant="glass" onClick={exportCsv} disabled={!data.length}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <Reveal className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search item, merchant, order ID, or capture ref…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "COMPLETED", "NEEDS_VERIFICATION", "PENDING", "FAILED", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Reveal>

      <Reveal delay={0.05}>
        <GlassCard hover={false} className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-glass-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort("createdAt")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Date <ArrowUpDown className="size-3 opacity-50" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort("description")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Item <ArrowUpDown className="size-3 opacity-50" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Merchant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  <button onClick={() => handleSort("amount")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Amount <ArrowUpDown className="size-3 opacity-50" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cur.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Payment Ref / Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Capture ID / UTR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpen(r)}
                  className="cursor-pointer border-b border-glass-border/60 transition-colors hover:bg-muted"
                >
                  <td className="px-4 py-3 font-mono text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-foreground max-w-[240px] truncate">{r.description}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.sku}</td>
                  <td className="px-4 py-3 text-xs">{r.merchant}</td>
                  <td className="px-4 py-3 font-mono font-semibold">{formatUSD(r.amount, r.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.currency}</td>
                  <td className="px-4 py-3"><CopyId v={r.paypalOrderId} /></td>
                  <td className="px-4 py-3"><CopyId v={r.captureId} /></td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pageRows.length && (
            <div className="p-6">
              <EmptyState
                icon={Receipt}
                title="No transactions found"
                description="Transactions appear here after you authorize orders via Windows Hello or UPI push."
              />
            </div>
          )}
        </GlassCard>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">
            Page {page + 1} of {totalPages} ({filtered.length} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </Reveal>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Transaction Details</SheetTitle>
          </SheetHeader>
          {open && (
            <dl className="mt-6 space-y-3 font-mono text-xs">
              {Object.entries(open).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-glass-border pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate text-foreground font-medium">{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
