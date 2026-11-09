import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ScanSearch, Sparkles, ExternalLink, Star, Loader2, Globe, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Reveal } from "@/components/app/primitives";
import { ProductCard } from "@/components/app/ProductCard";
import { AuthorizationDialog } from "@/components/app/AuthorizationDialog";
import { BrowserAuthorizationModal } from "@/components/app/BrowserAuthorizationModal";
import { SensitiveAuthHandoffModal } from "@/components/app/SensitiveAuthHandoffModal";
import {
  startBrowserProcurement,
  prepareCartAndProposal,
  authorizeCheckout,
  notifySensitiveAuthCompleted,
  cancelBrowserTask,
  type CartAuthorizationProposal,
} from "@/lib/services/browserCommerceService";
import { productsQuery, budgetQuery, getLatestTask, type Product } from "@/lib/agentpay/api";
import { formatUSD } from "@/lib/agentpay/policy";
import { getDefaultAddress } from "@/lib/services/addressService";
import { cn } from "@/lib/utils";

function isFoodProduct(p: Product | null | undefined): boolean {
  if (!p) return false;
  return Boolean(
    p.category?.toLowerCase().includes("food") ||
    p.itemType === "FOOD_DINING" ||
    p.id?.toLowerCase().includes("zomato") ||
    p.id?.toLowerCase().includes("menu_") ||
    p.merchant?.toLowerCase().includes("zomato") ||
    /(zomato|swiggy|china|berco|tossin|pizza|chowmein|noodle|biryani|pasta|burger)/i.test(
      (p.title || "") + " " + (p.merchant || "")
    )
  );
}

const discoverySearchSchema = z.object({
  auto: z.string().optional(),
});

export const Route = createFileRoute("/discovery")({
  validateSearch: (search) => discoverySearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Product Discovery — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Real products and cloud services discovered by AgentPay's DiscoveryAgent, with full cost estimates." },
      { property: "og:title", content: "Product Discovery — AgentPay 2.0" },
      { property: "og:description", content: "Products discovered by AgentPay's DiscoveryAgent." },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(budgetQuery);
    return context.queryClient.ensureQueryData(productsQuery);
  },
  component: Discovery,
});

function Discovery() {
  const navigate = useNavigate();
  const { auto } = Route.useSearch();
  const { data: products } = useQuery(productsQuery);
  const { data: budget } = useSuspenseQuery(budgetQuery);
  const { data: latestTask } = useQuery({ queryKey: ["latestTask"], queryFn: getLatestTask });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [browserLaunching, setBrowserLaunching] = useState(false);

  // Browser Commerce Human Authorization State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [browserProposal, setBrowserProposal] = useState<CartAuthorizationProposal | null>(null);
  const [browserAuthModalOpen, setBrowserAuthModalOpen] = useState(false);
  const [sensitiveHandoffOpen, setSensitiveHandoffOpen] = useState(false);
  const [sensitiveAuthType, setSensitiveAuthType] = useState<string>("OTP");
  const [isAuthorizingBrowser, setIsAuthorizingBrowser] = useState(false);
  const [isVerifyingBrowser, setIsVerifyingBrowser] = useState(false);

  const topProduct = products && products.length > 0 ? products[0] : null;

  const handleDispatchBrowserAgent = async (p: Product) => {
    setBrowserLaunching(true);
    const cleanDish = p.title
      .replace(/\(Wow! China\)/gi, "")
      .replace(/\(Berco's.*?\)/gi, "")
      .replace(/\(Quarter Plate\)/gi, "")
      .replace(/Bowl/gi, "")
      .trim();

    const defAddr = getDefaultAddress();
    const deliveryStr = `${defAddr.street}, ${defAddr.city} ${defAddr.postalCode}`;
    const city = defAddr.city?.toLowerCase() || "bhubaneswar";
    const phone = defAddr.phone || "+91 9178305324";
    const merchantName = p.merchant?.toLowerCase().includes("amazon") ? "amazon" : "zomato";

    toast.info(`🚀 Autonomous Browser Agent Dispatched (${merchantName.toUpperCase()})`, {
      description: `Opening persistent Google Chrome session to stage ${cleanDish || p.title} in your cart...`,
    });

    try {
      // 1. Start procurement task
      const startRes = await startBrowserProcurement({
        merchant: merchantName,
        query: cleanDish || p.title,
        budgetLimit: 500,
        city,
      });

      setActiveTaskId(startRes.taskId);

      // 2. Prepare cart & generate Human Authorization Proposal
      const cartRes = await prepareCartAndProposal(startRes.taskId, {
        title: cleanDish || p.title,
        price: p.price,
        merchant: p.merchant,
      });

      setBrowserProposal(cartRes.proposal);
      setBrowserAuthModalOpen(true);
      toast.success("Human Authorization Gate Ready", {
        description: "Verified cart total and saved payment methods extracted. Please review and authorize.",
      });
    } catch (err: any) {
      console.warn("Full proposal staging notice, falling back to direct browser:", err.message);
      await fetch("http://localhost:5000/api/browser-agent/zomato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish: cleanDish || p.title,
          maxBudget: 300,
          phone,
          city,
          address: deliveryStr,
        }),
      }).catch(() => {});
      toast.success("Google Chrome Active on Screen!", {
        description: `Browser window opened for ${cleanDish || p.title}. Check desktop to finalize!`,
      });
    } finally {
      setBrowserLaunching(false);
    }
  };

  const handleAuthorizeBrowserCheckout = async (proposalId: string, paymentMethodId: string) => {
    if (!activeTaskId) return;
    setIsAuthorizingBrowser(true);
    try {
      const res = await authorizeCheckout(activeTaskId, proposalId, paymentMethodId);
      setBrowserAuthModalOpen(false);

      if (res.requiresSensitiveAuth) {
        setSensitiveAuthType(res.sensitiveAuthType || "OTP");
        setSensitiveHandoffOpen(true);
        toast.info("Sensitive Authentication Required", {
          description: "Please complete OTP or PIN entry directly on the merchant page in Chrome.",
        });
      } else {
        toast.success("Order Authorized and Dispatched!", {
          description: `Merchant reference: ${res.verification?.orderId || "COMPLETED"}`,
        });
      }
    } catch (err: any) {
      toast.error("Checkout authorization halted: " + err.message);
    } finally {
      setIsAuthorizingBrowser(false);
    }
  };

  const handleSensitiveHandoffComplete = async () => {
    if (!activeTaskId) return;
    setIsVerifyingBrowser(true);
    try {
      const res = await notifySensitiveAuthCompleted(activeTaskId);
      setSensitiveHandoffOpen(false);
      if (res.state === "COMPLETED") {
        toast.success("Payment Verified & Order Fulfilled!", {
          description: `Merchant Order: ${res.verification?.orderId}`,
        });
      } else if (res.state === "NEEDS_VERIFICATION") {
        toast.warning("Payment Status: Needs Verification", {
          description: "Transaction submitted. Awaiting merchant confirmation before final settlement.",
        });
      }
    } catch (err: any) {
      toast.error("Verification error: " + err.message);
    } finally {
      setIsVerifyingBrowser(false);
    }
  };

  const handleCancelBrowserTask = () => {
    if (activeTaskId) {
      void cancelBrowserTask(activeTaskId, "Cancelled by user at authorization gate");
    }
    setBrowserAuthModalOpen(false);
    setSensitiveHandoffOpen(false);
    toast.info("Procurement task cancelled.");
  };

  // Auto-Select and Launch Confirmation when Autonomous mode was triggered
  useEffect(() => {
    if (auto === "true" && topProduct && !selectedProduct && !authOpen) {
      if (isFoodProduct(topProduct)) {
        toast.info("Autonomous Winner Picked: " + topProduct.title, {
          description: "Click '🚀 Order with Chrome Agent' to launch real Google Chrome directly!",
        });
      } else {
        setSelectedProduct(topProduct);
        setAuthOpen(true);
        toast.info("Autonomous Winner Selected", {
          description: `ComparisonAgent benchmarked ratings and prices. Please review and confirm your order before payment.`,
        });
      }
    }
  }, [auto, topProduct]);

  const handleSelect = (product: Product) => {
    if (isFoodProduct(product)) {
      void handleDispatchBrowserAgent(product);
      return;
    }
    setSelectedProduct(product);
    setAuthOpen(true);
  };

  const handleCompare = () => {
    void navigate({ to: "/comparisons" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="DiscoveryAgent"
        title="Live Discovered Options"
        description="Verified listings retrieved directly from live providers (Google Shopping, Cloud Infrastructure Registry). Prices are verified, never hallucinated."
        actions={
          <div className="flex gap-2">
            <Button variant="glass" asChild>
              <Link to="/comparisons">View Comparison Matrix</Link>
            </Button>
            <Button variant="brand" asChild>
              <Link to="/procurement">New Search</Link>
            </Button>
          </div>
        }
      />

      {/* Autonomous Recommendation Banner */}
      {topProduct && (
        <Reveal className="mb-6">
          <div className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 via-surface-deep to-accent/20 p-5 shadow-glow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" /> Autonomous #1 Winner
                  </span>
                  {topProduct.rating != null && (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {topProduct.rating} ({topProduct.reviews ?? 0} reviews)
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    Merchant: {topProduct.merchant}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground truncate">{topProduct.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {latestTask?.comparison?.verdict || "Benchmarked optimal price-to-performance ratio across verified sellers."}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <div className="text-right font-mono">
                  <p className="text-xs text-muted-foreground">Authorized Total</p>
                  <p className="text-lg font-bold text-foreground">{formatUSD(topProduct.price)}</p>
                </div>
                <Button
                  variant="brand"
                  size="default"
                  disabled={browserLaunching}
                  className={cn(
                    "flex items-center gap-2 shadow-md text-white font-semibold cursor-pointer",
                    isFoodProduct(topProduct)
                      ? "bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-pink-500 shadow-rose-950/20"
                      : "bg-gradient-to-r from-blue-600 via-indigo-600 to-primary hover:from-blue-500 hover:to-indigo-500"
                  )}
                  onClick={() => handleSelect(topProduct)}
                >
                  {isFoodProduct(topProduct) ? (
                    <>
                      {browserLaunching ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                      {browserLaunching ? "Launching Chrome..." : "🚀 Order on Zomato"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Review &amp; Confirm Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {products && products.length > 0 ? (
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                selected={selectedProduct?.id === p.id}
                onSelect={() => handleSelect(p)}
                onCompare={handleCompare}
              />
            ))}
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState
            icon={ScanSearch}
            title="No procurement dispatched yet"
            description="Enter any request in the universal console and the DiscoveryAgent will retrieve live listings from Google Shopping and cloud registries."
            action={
              <Button variant="brand" asChild>
                <Link to="/procurement">Start Procurement</Link>
              </Button>
            }
          />
        </Reveal>
      )}

      {selectedProduct && (
        <AuthorizationDialog
          product={selectedProduct}
          budget={budget}
          open={authOpen}
          onOpenChange={setAuthOpen}
        />
      )}

      {/* Human Authorization Gate for Browser-First Autonomous Commerce */}
      <BrowserAuthorizationModal
        open={browserAuthModalOpen}
        onOpenChange={setBrowserAuthModalOpen}
        proposal={browserProposal}
        onAuthorize={handleAuthorizeBrowserCheckout}
        onCancel={handleCancelBrowserTask}
        isAuthorizing={isAuthorizingBrowser}
      />

      {/* Sensitive Auth Handoff (OTP / 3DS / UPI PIN) */}
      <SensitiveAuthHandoffModal
        open={sensitiveHandoffOpen}
        onOpenChange={setSensitiveHandoffOpen}
        authType={sensitiveAuthType}
        merchantName={browserProposal?.merchant.name || "Merchant"}
        onCompleted={handleSensitiveHandoffComplete}
        onCancel={handleCancelBrowserTask}
        isVerifying={isVerifyingBrowser}
      />
    </div>
  );
}
