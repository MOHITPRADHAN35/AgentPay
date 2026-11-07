import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Bot, ShoppingBag, CheckCircle, AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { ShoppingPromptConsole } from "./ShoppingPromptConsole";
import { ProductCard } from "./ProductCard";
import { ProductComparison } from "./ProductComparison";
import { AgentActivity } from "./AgentActivity";
import { ApprovalModal } from "./ApprovalModal";
import { dispatchOrchestratorTask } from "@/lib/agentpay.functions";
import type { AgentTask } from "@/lib/types/agent";
import type { NormalizedProduct } from "@/lib/types/product";
import type { AppConfig } from "@/lib/agentpay.functions";

interface AgenticShoppingWorkspaceProps {
  config: AppConfig | undefined;
  remainingBudget: number;
  onOrderCompleted?: () => void;
  onSwitchToLegacy?: () => void;
}

export function AgenticShoppingWorkspace({
  config,
  remainingBudget,
  onOrderCompleted,
  onSwitchToLegacy
}: AgenticShoppingWorkspaceProps) {
  const dispatchOrchestrator = useServerFn(dispatchOrchestratorTask);

  const [isLoading, setIsLoading] = useState(false);
  const [task, setTask] = useState<AgentTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparingProducts, setComparingProducts] = useState<NormalizedProduct[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<NormalizedProduct | null>(null);
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

  const handleSearch = async (prompt: string, budget?: number, category?: string) => {
    setIsLoading(true);
    setError(null);
    setApprovalConfirmed(false);
    try {
      const res = await dispatchOrchestrator({ data: { prompt } });
      setTask(res);
      if (res.recommendedProduct) {
        setSelectedProduct(res.recommendedProduct);
      }
      if (res.comparison?.products) {
        setComparingProducts(res.comparison.products);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Orchestration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCompare = (product: NormalizedProduct) => {
    if (comparingProducts.some((p) => p.id === product.id)) {
      setComparingProducts(comparingProducts.filter((p) => p.id !== product.id));
    } else {
      setComparingProducts([...comparingProducts, product]);
    }
  };

  const handleSelectProduct = (product: NormalizedProduct) => {
    setSelectedProduct(product);
    setIsApprovalOpen(true);
  };

  const handleConfirmApproval = (product: NormalizedProduct) => {
    setSelectedProduct(product);
    setApprovalConfirmed(true);
  };

  return (
    <div className="w-full space-y-6">
      {/* Search and Prompt Console */}
      <ShoppingPromptConsole onSearch={handleSearch} isLoading={isLoading} />

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Task Summary Banner */}
      {task && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Active Procurement Task</span>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
                  {task.status}
                </span>
                <span className="text-[11px] text-slate-400">Category: {task.category}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">"{task.prompt}"</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task.comparison && (
              <button
                onClick={() => setShowComparisonModal(!showComparisonModal)}
                className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                {showComparisonModal ? "Hide Comparison" : "View Comparison Matrix"}
              </button>
            )}
            {selectedProduct && !approvalConfirmed && (
              <button
                onClick={() => setIsApprovalOpen(true)}
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-500"
              >
                Review Authorization
              </button>
            )}
          </div>
        </div>
      )}

      {/* Budget Guardrail Notice if purchase exceeds policy */}
      {task?.budgetCheck && !task.budgetCheck.isAllowed && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300">Guardrail Enforced: Budget Ceiling Exceeded</div>
            <p className="text-amber-200/90">{task.budgetCheck.reason}</p>
            <p className="text-[11px] text-amber-400/80">
              AgentPay policy limits single transactions to $35.00 and daily spend to $100.00 by default. The multi-agent system successfully discovered, parsed, and benchmarked verified retailer listings below. You can inspect the spec comparison matrix and direct merchant checkout links.
            </p>
          </div>
        </div>
      )}

      {/* Side-by-side comparison matrix (toggleable) */}
      {showComparisonModal && task?.comparison && (
        <ProductComparison
          comparison={task.comparison}
          onSelectOption={(p) => {
            handleSelectProduct(p);
            setShowComparisonModal(false);
          }}
          onClose={() => setShowComparisonModal(false)}
        />
      )}

      {/* Product Discovery Grid */}
      {task?.comparison?.products && task.comparison.products.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Discovered Live Listings ({task.comparison.products.length})</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Live Google Shopping & Developer Registry</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {task.comparison.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedProduct?.id === product.id}
                onSelect={handleSelectProduct}
                onToggleCompare={handleToggleCompare}
                isComparing={comparingProducts.some((p) => p.id === product.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* User Approval Card when Authorized */}
      {approvalConfirmed && selectedProduct && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Purchase Authorized by User</h4>
                <p className="text-xs text-slate-300">
                  Ready to complete checkout with {selectedProduct.merchant.name} for ${selectedProduct.totalEstimated.toFixed(2)} USD.
                </p>
              </div>
            </div>
            <a
              href={selectedProduct.productUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-emerald-500"
            >
              Complete Merchant Checkout ↗
            </a>
          </div>
        </div>
      )}

      {/* Real Agent Activity Trace */}
      {task?.activityLogs && task.activityLogs.length > 0 && (
        <AgentActivity activityLogs={task.activityLogs} />
      )}

      {/* Approval Modal */}
      {selectedProduct && (
        <ApprovalModal
          isOpen={isApprovalOpen}
          onClose={() => setIsApprovalOpen(false)}
          product={selectedProduct}
          remainingBudget={remainingBudget}
          onConfirmApproval={handleConfirmApproval}
        />
      )}
    </div>
  );
}

