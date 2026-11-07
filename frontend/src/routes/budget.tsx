import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { budgetQuery, saveLimits, type CategoryKey } from "@/lib/agentpay/api";
import { formatUSD, POLICY_BOUNDS, validateLimits } from "@/lib/agentpay/policy";
import { BudgetBar, GlassCard, NotConnectedNote, PageHeader, Reveal } from "@/components/app/primitives";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Budget & Policies — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Set the spending limits and category permissions AgentPay's agents must follow." },
      { property: "og:title", content: "Budget & Policies — AgentPay 2.0" },
      { property: "og:description", content: "Spending policy controls for AgentPay." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(budgetQuery),
  component: Budget,
});

const CATS: { key: CategoryKey; label: string; hint: string }[] = [
  { key: "hardware", label: "Consumer Hardware", hint: "Laptops, peripherals, devices" },
  { key: "compute", label: "Cloud GPUs & Compute", hint: "H100s, instances, serverless" },
  { key: "tokens", label: "AI Token Credits", hint: "Groq, model API credits" },
  { key: "domains", label: "Domains & Hosting", hint: "Registrations and renewals" },
  { key: "food", label: "Food & Dining Delivery", hint: "Zomato MCP restaurant orders & meals" },
];

function LimitControl({ label, value, onChange, max, step }: { label: string; value: number; onChange: (n: number) => void; max: number; step: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-sm font-medium">{label}</p><p className="font-mono text-[11px] text-muted-foreground">Max {formatUSD(max)}</p></div>
        <div className="relative w-32">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input type="number" value={value} min={1} max={max} onChange={(e) => onChange(Number(e.target.value))} className="pl-6 text-right font-mono" />
        </div>
      </div>
      <Slider value={[value]} min={1} max={max} step={step} onValueChange={([v]) => onChange(v ?? value)} />
    </div>
  );
}

function Budget() {
  const { data: b } = useSuspenseQuery(budgetQuery);
  const [single, setSingle] = useState(b.singleTransactionLimit);
  const [daily, setDaily] = useState(b.dailyLimit);
  const [cats, setCats] = useState(b.categories);
  const [saving, setSaving] = useState(false);
  const errors = validateLimits({ singleTransactionLimit: single, dailyLimit: daily });

  async function save() {
    if (errors.length) return;
    setSaving(true);
    try { await saveLimits({ singleTransactionLimit: single, dailyLimit: daily, categories: cats }); toast.success("Limits saved"); }
    catch (e) { toast.error("Limits not saved", { description: (e as Error).message + " Policies must be enforced by the server." }); }
    finally { setSaving(false); }
  }
  return (
    <div>
      <PageHeader eyebrow="Financial policy" title="Budget & policies" description="These limits are enforced on the server for every agent purchase. Sliders alone never authorize spending."
        actions={<Button variant="brand" onClick={save} disabled={saving || errors.length > 0}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save Limits</Button>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Reveal>
            <GlassCard hover={false} className="space-y-8 p-6">
              <LimitControl label="Single transaction limit" value={single} onChange={setSingle} max={POLICY_BOUNDS.singleTransactionLimit.max} step={5} />
              <div className="h-px bg-border" />
              <LimitControl label="Daily spending limit" value={daily} onChange={setDaily} max={POLICY_BOUNDS.dailyLimit.max} step={10} />
              {errors.length > 0 && <ul className="space-y-1 text-xs text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
            </GlassCard>
          </Reveal>
          <Reveal delay={0.05}>
            <GlassCard hover={false} className="p-6">
              <h2 className="mb-4 text-sm font-semibold">Category permissions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {CATS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-glass-border bg-glass p-4 transition-colors hover:border-ring/30">
                    <div><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{c.hint}</p></div>
                    <Switch checked={cats[c.key]} onCheckedChange={(v) => setCats({ ...cats, [c.key]: v })} />
                  </label>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        </div>
        <div className="space-y-5">
          <Reveal delay={0.1}>
            <GlassCard hover={false} className="p-6">
              <h2 className="mb-5 text-sm font-semibold">Today</h2>
              <dl className="mb-5 space-y-2 font-mono text-sm">
                {[["Daily limit", b.dailyLimit], ["Spent today", b.spentToday], ["Reserved", b.reserved], ["Remaining", b.remaining]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{formatUSD(v as number)}</dd></div>
                ))}
              </dl>
              <BudgetBar spent={b.spentToday} reserved={b.reserved} limit={b.dailyLimit} />
              <p className="mt-5 font-mono text-[11px] text-muted-foreground">Last updated: {b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "never (defaults)"}</p>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.15}><NotConnectedNote>Spending policies are actively synchronized and enforced on the server for all agent procurements.</NotConnectedNote></Reveal>
        </div>
      </div>
    </div>
  );
}
