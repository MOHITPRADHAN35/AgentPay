import { Check, Sparkles, X } from "lucide-react";
import type { ProductComparisonResult, NormalizedProduct } from "../../types/product";

interface ProductComparisonProps {
  comparison: ProductComparisonResult;
  onSelectOption: (product: NormalizedProduct) => void;
  onClose?: () => void;
}

export function ProductComparison({ comparison, onSelectOption, onClose }: ProductComparisonProps) {
  if (!comparison || comparison.products.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Multi-Product Specification Benchmark</h3>
            <p className="text-xs text-indigo-300">{comparison.verdict}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="py-3 pr-4 font-semibold">Specification</th>
              {comparison.products.map((p) => {
                const isBest = p.id === comparison.bestOptionId;
                return (
                  <th key={p.id} className="min-w-[180px] py-3 px-3">
                    <div className="flex flex-col gap-1">
                      {isBest && (
                        <span className="w-fit rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          ★ RECOMMENDED
                        </span>
                      )}
                      <span className="font-semibold text-white line-clamp-1">{p.title}</span>
                      <span className="text-indigo-400 font-mono font-bold">${p.price.toFixed(2)}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {comparison.specComparison.map((row) => (
              <tr key={row.featureName} className="hover:bg-white/[0.02]">
                <td className="py-2.5 pr-4 font-semibold text-slate-400">{row.featureName}</td>
                {comparison.products.map((p) => (
                  <td key={p.id} className="py-2.5 px-3 font-mono">
                    {String(row.values[p.id] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10">
              <td className="py-4 pr-4 font-semibold text-slate-400">Action</td>
              {comparison.products.map((p) => {
                const isBest = p.id === comparison.bestOptionId;
                return (
                  <td key={p.id} className="py-4 px-3">
                    <button
                      onClick={() => onSelectOption(p)}
                      className={`w-full rounded-xl py-2 text-xs font-semibold shadow-md transition ${
                        isBest
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {isBest ? "Select Recommended" : "Select Alternative"}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

