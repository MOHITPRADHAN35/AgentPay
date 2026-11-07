import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Fingerprint, Loader2, ShieldCheck, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { auditQuery, verifyAuditChain } from "@/lib/agentpay/api";
import { EmptyState, GlassCard, PageHeader, Reveal } from "@/components/app/primitives";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Ledger — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "SHA-256 hash-chained audit trail of every AgentPay financial decision." },
      { property: "og:title", content: "Audit Ledger — AgentPay 2.0" },
      { property: "og:description", content: "Cryptographic audit chain for AgentPay." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(auditQuery),
  component: Audit,
});

function Audit() {
  const { data } = useSuspenseQuery(auditQuery);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ intact: boolean; invalidIndex?: number; at: string } | null>(null);
  async function verify() {
    setBusy(true);
    try { setResult({ ...(await verifyAuditChain()), at: new Date().toISOString() }); }
    catch (e) { toast.error("Verification unavailable", { description: (e as Error).message }); }
    finally { setBusy(false); }
  }
  const stats = [
    { label: "Chain integrity", value: result ? (result.intact ? "AUDIT CHAIN INTACT" : `BROKEN AT #${result.invalidIndex}`) : "Not verified" },
    { label: "Verified entries", value: result?.intact ? String(data.length) : "—" },
    { label: "Last verification", value: result?.at ? new Date(result.at).toLocaleString() : "Never" },
  ];
  return (
    <div>
      <PageHeader eyebrow="Cryptographic audit" title="Audit ledger" description="Each entry stores the hash of the previous one. Verification runs on the server."
        actions={<Button variant="brand" onClick={verify} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Verify Chain</Button>} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.05}>
            <GlassCard className="p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`mt-3 font-mono text-sm font-semibold ${result?.intact && i === 0 ? "text-success" : result && i === 0 ? "text-destructive" : ""}`}>{s.value}</p>
            </GlassCard>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.1}>
        <GlassCard hover={false} className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead><tr className="border-b border-glass-border text-left text-xs text-muted-foreground">
              {["#", "SHA-256 hash", "Previous hash", "Transaction", "Recorded"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="font-mono text-xs">
              {data.map((e) => (
                <tr key={e.index} className={`border-b border-glass-border/60 ${result && !result.intact && result.invalidIndex === e.index ? "bg-destructive/10" : ""}`}>
                  <td className="px-4 py-3">{e.index}</td><td className="px-4 py-3">{e.hash.slice(0, 20)}…</td><td className="px-4 py-3 text-muted-foreground">{e.prevHash.slice(0, 20)}…</td>
                  <td className="px-4 py-3">{e.txRef}</td><td className="px-4 py-3">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.length && <div className="p-6"><EmptyState icon={Fingerprint} title="No audit entries" description="Entries are written when budgets change or payments are authorized." /></div>}
        </GlassCard>
      </Reveal>
      {!result && <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldQuestion className="size-3.5" />Integrity is only shown after a real server verification.</p>}
    </div>
  );
}
