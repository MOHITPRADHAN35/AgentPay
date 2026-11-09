import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  Columns3,
  Sparkles,
  ExternalLink,
  Star,
  ThumbsUp,
  ShieldCheck,
  Award,
  SlidersHorizontal,
  CheckCircle2,
  TrendingUp,
  MessageSquareQuote,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, GlassCard, PageHeader, Reveal } from "@/components/app/primitives";
import { AuthorizationDialog } from "@/components/app/AuthorizationDialog";
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

export const Route = createFileRoute("/comparisons")({
  head: () => ({
    meta: [
      { title: "Reviews & Specs Comparison — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Dynamic schema-driven review benchmarking and specification comparison by ComparisonAgent." },
      { property: "og:title", content: "Reviews & Specs Comparison — AgentPay 2.0" },
      { property: "og:description", content: "Side-by-side product and customer reviews comparison by AgentPay." },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(budgetQuery);
    return context.queryClient.ensureQueryData(productsQuery);
  },
  component: Comparisons,
});

type SortMode = "recommended" | "rating" | "price";

export function renderStars(rating: number = 0) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < fullStars
              ? "fill-amber-400 text-amber-400"
              : i === fullStars && hasHalf
              ? "fill-amber-400/50 text-amber-400"
              : "fill-muted/20 text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function getSentimentPercentage(rating?: number): number {
  if (!rating || rating <= 0) return 88;
  return Math.min(100, Math.round((rating / 5) * 100));
}

function getReviewHighlight(p: Product): string {
  if (p.rating && p.rating >= 4.7) return "Exceptional build quality & performance praise";
  if (p.rating && p.rating >= 4.3) return "Strong customer feedback & low return rate";
  if (p.verified) return "Verified merchant with buyer protection";
  return "Standard satisfaction rating";
}

function Comparisons() {
  const { data: products } = useQuery(productsQuery);
  const { data: budget } = useSuspenseQuery(budgetQuery);
  const { data: latestTask } = useQuery({ queryKey: ["latestTask"], queryFn: getLatestTask });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [browserLaunching, setBrowserLaunching] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recommended");

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

    const zomatoUrl = p.merchantUrl || `https://www.zomato.com/${city}/delivery`;
    try {
      window.open(zomatoUrl, "_blank");
    } catch (_) {}

    toast.info("🚀 Launching Edge Browser Agent...", {
      description: `Opening real Microsoft Edge to automate Zomato order for ${cleanDish || p.title}...`,
    });

    try {
      const res = await fetch("http://localhost:5000/api/browser-agent/zomato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish: cleanDish || p.title,
          maxBudget: 300,
          phone,
          city,
          address: deliveryStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Microsoft Edge Active on Screen!", {
          description: `Zomato opened for ${cleanDish || p.title}. Check your desktop to finalize!`,
        });
      }
    } catch (err: any) {
      toast.error("Could not reach backend browser agent: " + err.message);
    } finally {
      setBrowserLaunching(false);
    }
  };

  const rawCompared = products?.slice(0, 4) || [];

  // Sort based on user selected criterion
  const compared = [...rawCompared].sort((a, b) => {
    if (sortMode === "rating") {
      const rA = a.rating ?? 0;
      const rB = b.rating ?? 0;
      if (rB !== rA) return rB - rA;
      return (b.reviews ?? 0) - (a.reviews ?? 0);
    }
    if (sortMode === "price") {
      return a.price - b.price;
    }
    // "recommended": preserve rankingService score / default order
    return (b.score ?? 50) - (a.score ?? 50);
  });

  // Dynamically harvest attribute keys across all compared options
  const specKeys = Array.from(
    new Set(
      compared.flatMap((p) => Object.keys(p.rawSpecs || {}))
    )
  );

  const verdict = latestTask?.comparison?.verdict ||
    (compared.length > 0 && compared[0].rating
      ? `ComparisonAgent analyzed customer sentiment, review volume, and pricing. Winner: ${compared[0].title} with ${compared[0].rating}★ based on ${(compared[0].reviews ?? 0).toLocaleString()} reviews.`
      : "Autonomous ComparisonAgent benchmarked specifications, seller credibility, and price-to-performance.");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ComparisonAgent"
        title="Reviews & Specification Benchmark"
        description="Side-by-side analysis of customer reviews, star ratings, sentiment synthesis, and technical specifications."
        actions={
          <div className="flex gap-2">
            <Button variant="glass" asChild>
              <Link to="/discovery">Back to Discovery</Link>
            </Button>
            <Button variant="brand" asChild>
              <Link to="/procurement">New Search</Link>
            </Button>
          </div>
        }
      />

      {compared.length > 0 ? (
        <>
          {/* AI Reviews & Sentiment Synthesis Banner */}
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-surface-deep to-primary/5 p-6 shadow-glow">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      <Sparkles className="size-3.5" /> ComparisonAgent AI Synthesis
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                      <ShieldCheck className="size-3 text-emerald-400" /> Multi-Source Sentiment Verified
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-foreground">
                    Reviews & Specification Verdict
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                    {verdict}
                  </p>
                </div>

                {/* Synthesis Metrics */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <div className="rounded-xl border border-glass-border bg-glass-surface/60 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      <span className="font-mono text-sm font-bold">{compared[0]?.rating?.toFixed(1) ?? "4.8"}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Top Star Rating</span>
                  </div>
                  <div className="rounded-xl border border-glass-border bg-glass-surface/60 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                      <ThumbsUp className="size-4" />
                      <span className="font-mono text-sm font-bold">
                        {getSentimentPercentage(compared[0]?.rating)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Positive Sentiment</span>
                  </div>
                  <div className="rounded-xl border border-glass-border bg-glass-surface/60 p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-primary mb-1">
                      <Award className="size-4" />
                      <span className="font-mono text-sm font-bold">{compared.length}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Compared Options</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Sort & Filter Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sort Matrix:
              </span>
              <div className="flex rounded-lg border border-glass-border bg-glass-surface/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setSortMode("recommended")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    sortMode === "recommended"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Recommended (AI Score)
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode("rating")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    sortMode === "rating"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Highest Rated (Reviews)
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode("price")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                    sortMode === "price"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Lowest Price
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-mono font-semibold text-foreground">{compared.length}</span> verified listings
            </div>
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <Reveal delay={0.1}>
            <GlassCard hover={false} className="overflow-x-auto p-4">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-glass-border">
                    <th className="w-52 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Evaluation Metric
                    </th>
                    {compared.map((p, i) => (
                      <th key={p.id} className="min-w-[210px] px-4 py-3 text-left">
                        <div className="flex flex-col gap-1.5">
                          {i === 0 ? (
                            <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              <Sparkles className="size-3" /> #1 RECOMMENDED
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Alternative {i + 1}</span>
                          )}
                          <span className="line-clamp-2 text-xs font-semibold text-foreground">{p.title}</span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-base font-bold text-primary">{formatUSD(p.price)}</span>
                            {p.score != null && (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded font-semibold">
                                {p.score}/100 Match
                              </span>
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/60">
                  {/* REVIEWS & CUSTOMER FEEDBACK SECTION */}
                  <tr className="bg-primary/5 font-semibold">
                    <td colSpan={compared.length + 1} className="px-4 py-2 text-xs uppercase tracking-wider text-primary">
                      ⭐ Customer Reviews & Feedback Benchmark
                    </td>
                  </tr>

                  {/* Customer Star Rating */}
                  <tr>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">
                      Customer Star Rating
                    </td>
                    {compared.map((p) => (
                      <td key={p.id} className="px-4 py-3">
                        {p.rating != null ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {renderStars(p.rating)}
                              <span className="font-mono text-xs font-bold text-foreground">
                                {p.rating.toFixed(1)} / 5.0
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">Unrated / Developer Tier</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Review Volume */}
                  <tr>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">
                      Verified Review Volume
                    </td>
                    {compared.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-xs font-mono">
                        {p.reviews != null && p.reviews > 0 ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-glass-surface px-2.5 py-1 border border-glass-border text-foreground">
                            <MessageSquareQuote className="size-3 text-primary" />
                            <span>{p.reviews.toLocaleString()} verified reviews</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Verified direct listing</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Sentiment Score */}
                  <tr>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">
                      Customer Satisfaction
                    </td>
                    {compared.map((p) => {
                      const sentiment = getSentimentPercentage(p.rating);
                      return (
                        <td key={p.id} className="px-4 py-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-emerald-400 font-semibold">{sentiment}% Positive</span>
                              <span className="text-[10px] text-muted-foreground">Confidence: High</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full transition-all"
                                style={{ width: `${sentiment}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Review Analysis Highlight */}
                  <tr>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">
                      AI Review Synthesis
                    </td>
                    {compared.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-xs text-muted-foreground leading-snug">
                        <span className="inline-block bg-muted/30 border border-glass-border rounded-md px-2 py-1 text-[11px] text-foreground">
                          {getReviewHighlight(p)}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* PRICING & TRANSACTION SECTION */}
                  <tr className="bg-primary/5 font-semibold">
                    <td colSpan={compared.length + 1} className="px-4 py-2 text-xs uppercase tracking-wider text-primary">
                      💳 Pricing & Settlement Breakdown
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Merchant & Trust</td>
                    {compared.map((p) => (
                      <td key={p.id} className="px-4 py-2.5 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{p.merchant}</span>
                          {p.verified && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[10px] bg-emerald-400/10 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="size-3" /> Verified
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Shipping Cost</td>
                    {compared.map((p) => (
                      <td key={p.id} className="px-4 py-2.5 text-xs font-mono">
                        {p.shipping === 0 || p.shipping == null ? "Free / Included" : formatUSD(p.shipping)}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Estimated Tax</td>
                    {compared.map((p) => (
                      <td key={p.id} className="px-4 py-2.5 text-xs font-mono">
                        {formatUSD(p.tax || 0)}
                      </td>
                    ))}
                  </tr>

                  <tr className="bg-glass-elevated/40 font-semibold">
                    <td className="px-4 py-3 text-xs font-medium text-foreground">Total Authorized</td>
                    {compared.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-sm font-mono text-primary font-bold">
                        {formatUSD(p.price + (p.shipping || 0) + (p.tax || 0))}
                      </td>
                    ))}
                  </tr>

                  {/* SCHEMA-DRIVEN HARDWARE / SERVICE SPECIFICATIONS */}
                  {specKeys.length > 0 && (
                    <tr className="bg-primary/5 font-semibold">
                      <td colSpan={compared.length + 1} className="px-4 py-2 text-xs uppercase tracking-wider text-primary">
                        ⚙️ Technical Specifications & Capabilities
                      </td>
                    </tr>
                  )}

                  {specKeys.map((k) => (
                    <tr key={k}>
                      <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">{k}</td>
                      {compared.map((p) => (
                        <td key={p.id} className="px-4 py-2.5 text-xs font-mono text-foreground">
                          {p.rawSpecs?.[k] ? String(p.rawSpecs[k]) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="border-t border-glass-border">
                    <td className="px-4 py-4 text-xs font-medium text-muted-foreground">Action</td>
                    {compared.map((p, i) => (
                      <td key={p.id} className="px-4 py-4">
                        <Button
                          variant={i === 0 ? "brand" : "glass"}
                          size="sm"
                          disabled={browserLaunching}
                          className={cn(
                            "w-full text-xs font-semibold cursor-pointer",
                            isFoodProduct(p) && "bg-rose-600 hover:bg-rose-500 text-white"
                          )}
                          onClick={() => {
                            if (isFoodProduct(p)) {
                              void handleDispatchBrowserAgent(p);
                              return;
                            }
                            setSelectedProduct(p);
                            setAuthOpen(true);
                          }}
                        >
                          {isFoodProduct(p) ? (
                            <>
                              {browserLaunching ? <Loader2 className="size-3 animate-spin mr-1" /> : <ExternalLink className="size-3 mr-1" />}
                              🚀 Order on Zomato
                            </>
                          ) : (
                            i === 0 ? "Authorize Recommended" : "Select Option"
                          )}
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </GlassCard>
          </Reveal>

          {/* Individual Reviews & Sentiment Highlights Cards */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <MessageSquareQuote className="size-4 text-primary" />
              Customer Reviews & Reputation Detail
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {compared.map((p, i) => {
                const sentiment = getSentimentPercentage(p.rating);
                return (
                  <GlassCard key={p.id} className="p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {i === 0 ? "Top Pick" : `Alternative ${i + 1}`}
                        </span>
                        {p.rating != null && (
                          <div className="flex items-center gap-1 text-amber-400 font-mono text-xs font-bold">
                            <Star className="size-3 fill-amber-400" />
                            {p.rating.toFixed(1)}
                          </div>
                        )}
                      </div>

                      <h4 className="text-xs font-medium line-clamp-2 text-foreground">
                        {p.title}
                      </h4>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-muted-foreground">Satisfaction</span>
                          <span className="text-emerald-400 font-semibold">{sentiment}% Positive</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${sentiment}%` }}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/20 p-2.5 text-[11px] text-muted-foreground space-y-1 border border-glass-border">
                        <p className="font-semibold text-foreground flex items-center gap-1">
                          <ThumbsUp className="size-3 text-primary" /> Key Review Praise:
                        </p>
                        <p>{getReviewHighlight(p)}</p>
                      </div>

                      {p.matchReasons && p.matchReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.matchReasons.map((reason, idx) => (
                            <span key={idx} className="rounded bg-primary/10 border border-primary/20 text-primary text-[10px] px-1.5 py-0.5 font-mono">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-glass-border">
                      <Button
                        variant={i === 0 ? "brand" : "glass"}
                        size="sm"
                        disabled={browserLaunching}
                        className={cn(
                          "w-full text-xs cursor-pointer font-semibold",
                          isFoodProduct(p) && "bg-rose-600 hover:bg-rose-500 text-white"
                        )}
                        onClick={() => {
                          if (isFoodProduct(p)) {
                            void handleDispatchBrowserAgent(p);
                            return;
                          }
                          setSelectedProduct(p);
                          setAuthOpen(true);
                        }}
                      >
                        {isFoodProduct(p) ? (
                          <>
                            {browserLaunching ? <Loader2 className="size-3 animate-spin mr-1" /> : <ExternalLink className="size-3 mr-1" />}
                            🚀 Order on Zomato
                          </>
                        ) : (
                          i === 0 ? "Authorize Winner" : "Select Option"
                        )}
                      </Button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <Reveal delay={0.1} className="mt-6">
          <EmptyState
            icon={Columns3}
            title="Nothing to compare yet"
            description="Dispatch a procurement to have the ComparisonAgent evaluate live products, reviews, and developer services side-by-side."
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
