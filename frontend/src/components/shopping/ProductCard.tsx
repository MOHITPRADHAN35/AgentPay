import { CheckCircle2, ShieldCheck, ExternalLink, Star, ArrowUpRight } from "lucide-react";
import type { NormalizedProduct } from "../../types/product";

interface ProductCardProps {
  product: NormalizedProduct;
  isSelected?: boolean;
  onSelect?: (product: NormalizedProduct) => void;
  onToggleCompare?: (product: NormalizedProduct) => void;
  isComparing?: boolean;
}

export function ProductCard({
  product,
  isSelected,
  onSelect,
  onToggleCompare,
  isComparing
}: ProductCardProps) {
  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${
        isSelected
          ? "border-indigo-500 bg-indigo-950/20 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500"
          : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/80"
      }`}
    >
      {/* Top badges */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            <span>{product.merchant.name}</span>
            {product.merchant.isVerified && <span className="text-[10px] opacity-75">(Verified)</span>}
          </div>

          {product.score !== undefined && (
            <span className="rounded-md border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
              Score: {product.score}/100
            </span>
          )}
        </div>

        {/* Thumbnail or fallback */}
        <div className="relative mt-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-black/40">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="text-xs text-slate-500 font-mono">Verified Merchant Listing</div>
          )}
          {product.rating && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-md">
              <Star className="h-3 w-3 fill-amber-400" />
              <span>{product.rating}</span>
              {product.reviewsCount && <span className="text-slate-400">({product.reviewsCount})</span>}
            </div>
          )}
        </div>

        {/* Title & Brand */}
        <div className="mt-3">
          <span className="text-[11px] font-semibold tracking-wider text-indigo-400 uppercase">{product.brand}</span>
          <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-indigo-200">
            {product.title}
          </h3>
        </div>

        {/* Specifications Pills */}
        <div className="mt-2.5 flex flex-wrap gap-1">
          {Object.entries(product.specifications || {}).slice(0, 4).map(([key, val]) => (
            <span
              key={key}
              className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300"
            >
              <strong className="text-slate-400 uppercase">{key}:</strong> {String(val)}
            </span>
          ))}
        </div>

        {/* Match reasons */}
        {product.matchReasons && product.matchReasons.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {product.matchReasons.slice(0, 2).map((reason, i) => (
              <div key={i} className="flex items-center gap-1 text-[11px] text-emerald-400/90">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing & Actions Footer */}
      <div className="mt-4 border-t border-white/5 bg-black/20 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-slate-400">Listed Price</span>
            <div className="text-lg font-bold text-white">${product.price.toFixed(2)}</div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <div>+ Est. Tax: ${product.taxEstimated.toFixed(2)}</div>
            <div className="font-semibold text-slate-200">Total: ${product.totalEstimated.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(product)}
              className={`flex-1 rounded-xl border py-2 text-xs font-medium transition ${
                isComparing
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {isComparing ? "✓ Comparing" : "Compare"}
            </button>
          )}

          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(product)}
              className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500"
            >
              Select Item
            </button>
          )}

          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open merchant product page"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

