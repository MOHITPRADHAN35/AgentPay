import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Activity, CircleDollarSign, Lock, PiggyBank, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AGENTS, budgetQuery } from "@/lib/agentpay/api";
import { formatUSD } from "@/lib/agentpay/policy";
import { AnimatedNumber, BudgetBar, EmptyState, GlassCard, NotConnectedNote, Reveal, StatusBadge } from "@/components/app/primitives";
import { AGENT_ICONS } from "@/components/app/agent-icons";
import { CursorSpotlight, SpotlightText } from "@/components/app/CursorSpotlight";
import { CinematicIntro } from "@/components/app/CinematicIntro";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgentPay 2.0 — Intelligence With Boundaries" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Explore AgentPay's five-agent commerce workflow, financial guardrails and human-controlled PayPal authorization." },
      { property: "og:title", content: "AgentPay 2.0 — Intelligence With Boundaries" },
      { property: "og:description", content: "Delegate the work. Control the money. Discover the AgentPay autonomous commerce system." },
    ],
  }),
  component: CinematicIntro,
});

export function Overview({ directDashboard = true }: { directDashboard?: boolean }) {
  const { data: b } = useSuspenseQuery(budgetQuery);
  const kpis = [
    { label: "Daily Spending Limit", value: b.dailyLimit, icon: Wallet, sub: `Per transaction ${formatUSD(b.singleTransactionLimit)}` },
    { label: "Spent Today", value: b.spentToday, icon: CircleDollarSign, sub: `${Math.round((b.spentToday / b.dailyLimit) * 100)}% of daily limit` },
    { label: "Reserved in Checkout", value: b.reserved, icon: Lock, sub: "Awaiting PayPal capture" },
    { label: "Remaining Balance", value: b.remaining, icon: PiggyBank, sub: "Available for agents today" },
  ];
  return (
    <div className="space-y-10">
      <CursorSpotlight className="overview-highlight relative isolate overflow-hidden rounded-2xl glass px-6 py-10 md:px-10 md:py-14">
        <Reveal>
          <SpotlightText as="p" className="relative font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Command Center · Sandbox</SpotlightText>
          <SpotlightText as="h1" className="relative mt-4 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight text-gradient md:text-5xl">Your Autonomous Commerce Command Center</SpotlightText>
          <SpotlightText as="p" className="relative mt-4 max-w-xl text-base text-muted-foreground">Delegate procurement. Let intelligent agents evaluate. Stay in control of every payment.</SpotlightText>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="brand" size="lg" asChild><Link to="/procurement">Start New Procurement <ArrowRight /></Link></Button>
            <Button variant="glass" size="lg" asChild><Link to="/agents">View Agent Activity</Link></Button>
            <Button variant="ghost" size="lg" asChild><Link to="/intro">Explore AgentPay <ArrowRight /></Link></Button>
          </div>
        </Reveal>
      </CursorSpotlight>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.06}>
            <GlassCard className="p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{k.label}</span>
                <k.icon className="size-4" />
              </div>
              <p className="mt-4 font-mono text-2xl font-semibold tracking-tight md:text-3xl">
                <AnimatedNumber value={k.value} format={(n) => formatUSD(n)} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
            </GlassCard>
          </Reveal>
        ))}
      </section>

      <Reveal>
        <GlassCard hover={false} className="p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Budget utilization</h2>
            <span className="font-mono text-xs text-muted-foreground">{formatUSD(b.spentToday + b.reserved)} / {formatUSD(b.dailyLimit)}</span>
          </div>
          <BudgetBar spent={b.spentToday} reserved={b.reserved} limit={b.dailyLimit} />
        </GlassCard>
      </Reveal>

      <section>
        <Reveal className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Agents</h2>
          <Link to="/agents" className="text-xs text-primary hover:underline">Open execution center</Link>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {AGENTS.map((a, i) => {
            const Icon = AGENT_ICONS[a.name];
            return (
              <Reveal key={a.name} delay={i * 0.05}>
                <GlassCard className="h-full p-4">
                  <div className="flex items-center justify-between">
                    <div className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-4" /></div>
                    <StatusBadge status="PENDING" />
                  </div>
                  <p className="mt-3 text-sm font-medium">{a.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.role}</p>
                  <div className="mt-3 flex justify-between border-t border-glass-border pt-3 font-mono text-[10px] text-muted-foreground">
                    <span>Last run: —</span><span>Runs: 0</span>
                  </div>
                </GlassCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <GlassCard hover={false} className="p-6">
            <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
            <EmptyState icon={Activity} title="No activity yet" description="Procurements, comparisons, approvals and payments will appear here as they happen." />
          </GlassCard>
        </Reveal>
        <Reveal delay={0.1}><NotConnectedNote /></Reveal>
      </section>
    </div>
  );
}
