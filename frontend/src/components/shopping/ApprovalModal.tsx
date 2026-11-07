import { useState } from "react";
import { ShieldCheck, AlertCircle, Lock, ArrowRight, X, ExternalLink } from "lucide-react";
import type { NormalizedProduct } from "../../types/product";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: NormalizedProduct;
  remainingBudget: number;
  onConfirmApproval: (product: NormalizedProduct) => void;
}

export function ApprovalModal({
  isOpen,
  onClose,
  product,
  remainingBudget,
  onConfirmApproval
}: ApprovalModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen || !product) return null;

  const itemPrice = product.price;
  const shipping = product.shippingCost || 0;
  const tax = product.taxEstimated || 0;
  const total = itemPrice + shipping + tax;
  const budgetAfter = Math.max(0, remainingBudget - total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Purchase Authorization Gate</h2>
              <p className="text-xs text-slate-400">Human-in-the-Loop financial approval is strictly required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product summary */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/30 p-3.5">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-16 w-16 rounded-lg object-contain bg-white/5 p-1"
              />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">{product.category}</span>
              <h4 className="text-sm font-semibold text-white line-clamp-1">{product.title}</h4>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {product.merchant.name}
                </span>
                <span>•</span>
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:underline"
                >
                  Direct Merchant Link <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Cost breakdown breakdown */}
          <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Item Listed Price:</span>
              <span className="font-mono text-white">${itemPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Shipping:</span>
              <span className="font-mono text-white">{shipping === 0 ? "Free Shipping" : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Sales Tax (7%):</span>
              <span className="font-mono text-white">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-white">
              <span>Authorized Total:</span>
              <span className="font-mono text-emerald-400">${total.toFixed(2)} {product.currency}</span>
            </div>
          </div>

          {/* Budget validation info */}
          <div className={`rounded-xl border p-3 flex items-center justify-between text-xs ${
            total > remainingBudget
              ? "border-amber-500/30 bg-amber-950/20 text-amber-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-slate-300"
          }`}>
            <div>
              <span className="text-slate-400">Authorized Daily Cap:</span>
              <div className="font-bold text-white">${remainingBudget.toFixed(2)}</div>
            </div>
            <ArrowRight className={`h-4 w-4 ${total > remainingBudget ? "text-amber-400" : "text-emerald-400"}`} />
            <div className="text-right">
              <span className="text-slate-400">Balance Impact:</span>
              <div className={`font-bold ${total > remainingBudget ? "text-amber-400" : "text-emerald-400"}`}>
                {total > remainingBudget ? "Exceeds Cap (Override Required)" : `$${budgetAfter.toFixed(2)} remaining`}
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              {total > remainingBudget
                ? `I grant explicit financial override to authorize $${total.toFixed(2)} ${product.currency} and proceed with verified merchant ${product.merchant.name}.`
                : `I authorize AgentPay to reserve $${total.toFixed(2)} ${product.currency} and prepare PayPal checkout with verified merchant ${product.merchant.name}.`}
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-black/30 p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            disabled={!confirmed}
            onClick={() => {
              onConfirmApproval(product);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirm & Proceed to Checkout
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

