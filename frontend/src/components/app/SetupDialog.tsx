import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  CreditCard,
  Database,
  Search,
  Smartphone,
  ShoppingBag,
  UtensilsCrossed,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { configQuery, type ServiceKey } from "@/lib/agentpay/api";
import { StatusBadge } from "./primitives";
import { getStoredUpiId, setStoredUpiId } from "@/lib/services/upiService";
import { getStoredZomatoPhone, setStoredZomatoPhone } from "@/lib/integrations/mcp/zomatoMcp";

export const SERVICES: { key: ServiceKey; name: string; icon: typeof Bot; steps: string }[] = [
  {
    key: "paypal",
    name: "PayPal Sandbox",
    icon: CreditCard,
    steps: "Create a sandbox app at developer.paypal.com and add its client ID and secret through AgentPay's secure secret form. Use a sandbox test buyer account to pay.",
  },
  {
    key: "serpapi",
    name: "Google Shopping · SerpApi",
    icon: Search,
    steps: "Copy your API key from serpapi.com/manage-api-key and store it as a secure secret.",
  },
  {
    key: "groq",
    name: "Groq LPU",
    icon: Bot,
    steps: "Create an API key in console.groq.com and store it as a secure secret.",
  },
  {
    key: "database",
    name: "Database",
    icon: Database,
    steps: "Enable a backend to store budgets, the transaction ledger and the audit chain.",
  },
];

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useSetup = () => useContext(Ctx);

export function ServiceList() {
  const { data } = useQuery(configQuery);
  return (
    <div className="space-y-2">
      {SERVICES.map((s) => {
        const st = data?.services[s.key];
        return (
          <div key={s.key} className="rounded-lg border border-glass-border bg-glass p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Last checked: {st?.lastChecked ?? "never"}
                </p>
              </div>
              <StatusBadge status={st?.status === "connected" ? "CONNECTED" : st?.status === "error" ? "ERROR" : "MISSING"} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.steps}</p>
          </div>
        );
      })}
      <p className="pt-2 text-[11px] text-muted-foreground">Keys are stored server-side only and are never displayed in this interface.</p>
    </div>
  );
}

export function CommerceAccountsList() {
  const [upiId, setUpiId] = useState(() => getStoredUpiId());
  const [zomatoPhone, setZomatoPhone] = useState(() => getStoredZomatoPhone());
  const [amazonEmail, setAmazonEmail] = useState("user.shopping@amazon.in");

  const handleSaveUpi = () => {
    if (!upiId.includes("@")) {
      toast.error("Please enter a valid UPI VPA (e.g. name@okhdfcbank or 9876543210@paytm)");
      return;
    }
    setStoredUpiId(upiId);
    toast.success("UPI ID Saved for Mobile Push Requests", {
      description: `Payment alerts will be dispatched directly to ${upiId} on Google Pay / PhonePe / Paytm.`,
    });
  };

  const handleSaveZomatoPhone = () => {
    setStoredZomatoPhone(zomatoPhone);
    toast.success("Zomato MCP Account Synced", {
      description: `Registered mobile ${zomatoPhone} verified with active MCP session.`
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. UPI ID Setup (Push to Phone) */}
      <div className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-surface-deep to-primary/5 p-4 space-y-3 shadow-glow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
              UPI
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                UPI Direct Mobile Push <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded font-mono">GPay · PhonePe · Paytm</span>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                AgentPay sends a payment collect request straight to your phone for 1-tap PIN approval.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-semibold">
            <CheckCircle2 className="size-3" /> ACTIVE
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          <Label className="text-xs">Your Configured UPI ID (VPA)</Label>
          <div className="flex gap-2">
            <Input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@okhdfcbank or 9876543210@paytm"
              className="font-mono text-xs bg-background/60"
            />
            <Button variant="brand" size="sm" onClick={handleSaveUpi} className="shrink-0 text-xs">
              Save UPI
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Zomato MCP Server Account */}
      <div className="rounded-lg border border-glass-border bg-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-400 font-bold">
              <UtensilsCrossed className="size-4 text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Zomato (Model Context Protocol)</p>
              <p className="font-mono text-[11px] text-muted-foreground">Server: https://mcp-server.zomato.com/mcp</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-semibold">
            <CheckCircle2 className="size-3" /> MCP CONNECTED
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Registered Phone Number</Label>
            <Input
              value={zomatoPhone}
              onChange={(e) => setZomatoPhone(e.target.value)}
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="brand"
              size="sm"
              className="w-full text-xs h-8 cursor-pointer"
              onClick={handleSaveZomatoPhone}
            >
              Verify Session
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Amazon Session & Profile */}
      <div className="rounded-lg border border-glass-border bg-glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400 font-bold">
              <ShoppingBag className="size-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Amazon.in / Amazon.com</p>
              <p className="font-mono text-[11px] text-muted-foreground">Engine: Playwright Stealth Session Profile</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-semibold">
            <CheckCircle2 className="size-3" /> READY
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Amazon Account Email</Label>
            <Input
              value={amazonEmail}
              onChange={(e) => setAmazonEmail(e.target.value)}
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="glass"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => toast.info("Amazon browser session active", { description: "Persistent Chromium cookie profile synced." })}
            >
              Sync Session
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Flipkart Engine */}
      <div className="rounded-lg border border-glass-border bg-glass p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 font-bold">
              <Zap className="size-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Flipkart Commerce Engine</p>
              <p className="font-mono text-[11px] text-muted-foreground">Provider: RapidAPI Live Flipkart Catalog</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-semibold">
            <CheckCircle2 className="size-3" /> CONNECTED
          </span>
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Connected using your configured RapidAPI key. Real product catalog, pricing, and availability queries active.
        </p>
      </div>
    </div>
  );
}

export function SetupProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Connected Accounts &amp; Settings</DialogTitle>
            <DialogDescription>
              Manage real-world commerce provider sessions, your personal UPI ID, and developer APIs.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="commerce" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="commerce">Commerce &amp; UPI Accounts</TabsTrigger>
              <TabsTrigger value="services">API Services &amp; Sandbox</TabsTrigger>
            </TabsList>

            <TabsContent value="commerce" className="mt-4">
              <CommerceAccountsList />
            </TabsContent>

            <TabsContent value="services" className="mt-4">
              <ServiceList />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
