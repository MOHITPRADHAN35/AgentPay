import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MotionConfig } from "motion/react";
import {
  dispatchAgent,
  getBudget,
  getConfig,
  listTransactions,
  type DispatchResult,
} from "@/lib/agentpay.functions";
import { AgentPayHeader } from "@/components/agentpay/Header";
import { BudgetAuthorizationHUD } from "@/components/agentpay/BudgetHUD";
import { AgentDispatchConsole } from "@/components/agentpay/DispatchConsole";
import { ProcurementWorkspace } from "@/components/agentpay/ProcurementWorkspace";
import { TransactionLedger } from "@/components/agentpay/TransactionLedger";
import { Reveal } from "@/components/agentpay/primitives";
import { SandboxSetupModal } from "@/components/agentpay/SandboxSetupModal";

const configQ = queryOptions({
  queryKey: ["config"],
  queryFn: () => getConfig(),
  staleTime: 60_000,
});
const budgetQ = queryOptions({ queryKey: ["budget"], queryFn: () => getBudget() });
const txQ = queryOptions({ queryKey: ["transactions"], queryFn: () => listTransactions() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgentPay — Autonomous AI Agent Commerce via PayPal" },
      {
        name: "description",
        content:
          "An AI procurement terminal with server-enforced spending policies and explicit PayPal Sandbox approval.",
      },
      { property: "og:title", content: "AgentPay — Autonomous AI Agent Commerce" },
      {
        property: "og:description",
        content:
          "Delegate purchases to an AI agent, verified against budget guardrails before PayPal checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentPayShell,
});

function AgentPayShell() {
  const qc = useQueryClient();
  const config = useQuery(configQ);
  const budget = useQuery(budgetQ);
  const tx = useQuery(txQ);
  const dispatch = useServerFn(dispatchAgent);

  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [run, setRun] = useState<DispatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["budget"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  async function onDispatch(apiKey?: string, provider?: string) {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setRun(null);
    try {
      setRun(await dispatch({ data: { prompt, apiKey, provider } }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Dispatch failed.");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* Refraction filter used by .liquid-glass surfaces */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="agentpay-liquid" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale="28"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* Ambient light field — the colour that the glass surfaces refract */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-drift absolute -top-44 left-[8%] h-[520px] w-[520px] rounded-full bg-brand-blue/30 blur-[130px]" />
        <div className="animate-drift-late absolute right-[-6%] top-[36%] h-[440px] w-[440px] rounded-full bg-brand-orange/20 blur-[140px]" />
        <div className="animate-drift absolute bottom-[-18%] left-[32%] h-[500px] w-[600px] rounded-full bg-brand-navy/15 blur-[150px]" />
      </div>

      <div className="min-h-screen">
        <AgentPayHeader config={config.data} onSetup={() => setSetupOpen(true)} />
        <main className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:px-8 md:py-8">
          <Reveal>
            <BudgetAuthorizationHUD budget={budget.data} error={budget.isError} />
          </Reveal>
          <div className="grid gap-6 lg:grid-cols-[minmax(320px,5fr)_7fr]">
            <Reveal delay={0.08}>
              <AgentDispatchConsole
                value={prompt}
                onChange={(v) => {
                  setPrompt(v);
                  setSelected(null);
                }}
                onDispatch={onDispatch}
                busy={busy}
                selected={selected}
                onSelect={(sku, p) => {
                  setSelected(sku);
                  setPrompt(p);
                }}
              />
            </Reveal>
            <Reveal delay={0.16} className="h-full">
              <ProcurementWorkspace
                run={run}
                dispatching={busy}
                dispatchError={err}
                config={config.data}
                onLedgerChange={refresh}
              />
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <TransactionLedger rows={tx.data} loading={tx.isLoading} />
          </Reveal>
          <footer className="pb-6 pt-2 text-center font-mono text-[11px] text-muted-foreground">
            AgentPay · PayPal Sandbox only · No real funds are moved
          </footer>
        </main>
      </div>

      <SandboxSetupModal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        config={config.data}
        onRefreshed={(c) => qc.setQueryData(["config"], c)}
      />
    </MotionConfig>
  );
}

