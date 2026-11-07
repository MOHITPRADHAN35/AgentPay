import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ScanSearch, Sparkles, Fingerprint, ShieldCheck, Star } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Reveal } from "@/components/app/primitives";
import { ProductCard } from "@/components/app/ProductCard";
import { AuthorizationDialog } from "@/components/app/AuthorizationDialog";
import { productsQuery, budgetQuery, getLatestTask, type Product } from "@/lib/agentpay/api";
import { formatUSD } from "@/lib/agentpay/policy";

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

  const topProduct = products && products.length > 0 ? products[0] : null;

  // Auto-Select and Launch Confirmation when Autonomous mode was triggered
  useEffect(() => {
    if (auto === "true" && topProduct && !selectedProduct && !authOpen) {
      setSelectedProduct(topProduct);
      setAuthOpen(true);
      toast.info("Autonomous Winner Selected", {
        description: `ComparisonAgent benchmarked ratings and prices. Please review and confirm your order before payment.`,
      });
    }
  }, [auto, topProduct]);

  const handleSelect = (product: Product) => {
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
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-primary hover:from-blue-500 hover:to-indigo-500 shadow-md text-white font-semibold cursor-pointer"
                  onClick={() => handleSelect(topProduct)}
                >
                  <Sparkles className="size-4" /> Review &amp; Confirm Order
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
    </div>
  );
}
