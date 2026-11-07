import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Fingerprint, Loader2, ScanFace, SendHorizonal, ShieldCheck, SlidersHorizontal, Sparkles, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dispatchOrchestratorTask } from "@/lib/agentpay/api";
import { PageHeader, Reveal } from "@/components/app/primitives";
import { getDefaultAddress, getUserAddresses, type UserAddress } from "@/lib/services/addressService";
import { AddressVaultDialog } from "@/components/app/AddressVaultDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/procurement")({
  head: () => ({
    meta: [
      { title: "Universal Procurement — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Describe anything you want your AI agents to research, compare, or procure." },
      { property: "og:title", content: "Universal Procurement — AgentPay 2.0" },
      { property: "og:description", content: "Describe anything you want your AI agents to procure." },
    ],
  }),
  component: Procurement,
});

const MAX = 1000;

function Procurement() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(false);
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("auto");

  const [autoApprove, setAutoApprove] = useState(true);
  const [activeAddress, setActiveAddress] = useState<UserAddress>(() => getDefaultAddress());
  const [vaultOpen, setVaultOpen] = useState(false);

  async function dispatch() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      let fullPrompt = prompt;
      if (category && category !== "auto") {
        const catMap: Record<string, string> = {
          consumer: "Consumer Retail & Hardware",
          cloud: "Cloud Infrastructure & Developer Services",
          food: "Food & Dining Delivery via Zomato MCP Server",
        };
        fullPrompt += ` (Category: ${catMap[category] || category})`;
      }
      if (budget) {
        fullPrompt += ` with maximum budget $${budget}`;
      }
      const allAddresses = getUserAddresses();
      await dispatchOrchestratorTask({
        prompt: fullPrompt,
        deliveryAddress: activeAddress,
        userAddresses: allAddresses,
      });
      await qc.invalidateQueries({ queryKey: ["products"] });
      await qc.invalidateQueries({ queryKey: ["latestTask"] });
      toast.success("Agents dispatched successfully", {
        description: autoApprove
          ? "Benchmarking reviews & prices... Auto-selecting #1 pick for your order confirmation."
          : "Verified options discovered. Reviewing results...",
      });
      void navigate({ to: "/discovery", search: { auto: autoApprove ? "true" : undefined } });
    } catch (e) {
      toast.error("Couldn't dispatch agents", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Universal Procurement"
        title="What should your AI agents procure?"
        description="Describe anything in open natural language. Five specialized agents will interpret requirements, verify security, search live providers, benchmark specifications, and evaluate budget policies before requesting your authorization."
      />

      <Reveal>
        <div className="flex items-center justify-between px-2 pb-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setVaultOpen(true)}
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group cursor-pointer"
          >
            <MapPin className="size-3.5 text-primary group-hover:scale-110 transition-transform" />
            <span>Default Destination: <b className="text-foreground">{activeAddress.alias}</b> ({activeAddress.name}, {activeAddress.city} {activeAddress.postalCode})</span>
            <span className="text-[10px] text-primary underline ml-1">Change / Vault</span>
          </button>
          <span className="text-[11px] font-mono text-muted-foreground/60 hidden sm:inline">Jarvis Address Vault Active</span>
        </div>

        <div className="focus-beam rounded-2xl glass p-1.5">
          <textarea
            value={prompt}
            maxLength={MAX}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                dispatch();
              }
            }}
            placeholder="Describe anything you want your AI agents to research, compare, or procure (e.g. laptops with specific hardware, cloud GPU instances, gourmet pizza or dinner from Zomato, developer API credits, database hosting)..."
            rows={5}
            className="w-full resize-none rounded-xl bg-transparent px-4 py-4 text-base outline-none placeholder:text-muted-foreground/70"
          />

          {/* Autonomous Agent Mode Toggle */}
          <div className="border-t border-glass-border bg-glass/30 px-4 py-3 rounded-b-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
              <div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> Autonomous Agent Mode
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Agents benchmark reviews, ratings &amp; prices, pick the optimal option, and prepare order confirmation for your biometric payment.
                </p>
              </div>
            </label>

            <Button variant="brand" onClick={dispatch} disabled={!prompt.trim() || busy} className="shrink-0 flex items-center gap-2">
              {busy ? <Loader2 className="animate-spin size-4" /> : <SendHorizonal className="size-4" />} Dispatch Agents
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08} className="mt-6">
        <button
          onClick={() => setFilters((v) => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="size-4" /> Custom parameters & constraints
          <ChevronDown className={cn("size-4 transition-transform", filters && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {filters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid gap-4 rounded-xl glass p-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category Discovery Strategy</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Dynamic Auto-Detect</SelectItem>
                      <SelectItem value="consumer">Consumer Retail & Hardware (SerpApi)</SelectItem>
                      <SelectItem value="cloud">Cloud Infrastructure & Developer Services</SelectItem>
                      <SelectItem value="food">Food & Dining Delivery (Zomato MCP Server)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Budget ceiling (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Optional budget limit"
                    className="font-mono"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Reveal>

      <AddressVaultDialog
        open={vaultOpen}
        onOpenChange={setVaultOpen}
        onSelectAddress={setActiveAddress}
      />
    </div>
  );
}
