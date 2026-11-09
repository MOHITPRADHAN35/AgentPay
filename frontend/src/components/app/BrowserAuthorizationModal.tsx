import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Clock,
  AlertTriangle,
  CreditCard,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatUSD } from "@/lib/agentpay/policy";
import type { CartAuthorizationProposal, MaskedPaymentMethod } from "@/lib/services/browserCommerceService";

interface BrowserAuthorizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: CartAuthorizationProposal | null;
  onAuthorize: (proposalId: string, selectedPaymentMethodId: string) => Promise<void>;
  onCancel: () => void;
  isAuthorizing: boolean;
}

export function BrowserAuthorizationModal({
  open,
  onOpenChange,
  proposal,
  onAuthorize,
  onCancel,
  isAuthorizing,
}: BrowserAuthorizationModalProps) {
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 min TTL countdown
  const [hasExpired, setHasExpired] = useState<boolean>(false);

  useEffect(() => {
    if (proposal) {
      setSelectedMethodId(proposal.selectedPaymentMethod?.id || proposal.availablePaymentMethods[0]?.id || "");
      const expiresAt = new Date(proposal.expiresAt).getTime();
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remainingSeconds);
      setHasExpired(remainingSeconds <= 0);
    }
  }, [proposal]);

  // TTL Countdown timer
  useEffect(() => {
    if (!open || !proposal || hasExpired) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setHasExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, proposal, hasExpired]);

  if (!proposal) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  const formatCurrency = (amt: number) => {
    if (proposal.financials.currency === "INR") {
      return `₹${amt.toLocaleString("en-IN")}`;
    }
    return formatUSD(amt, proposal.financials.currency);
  };

  const handleConfirm = () => {
    if (hasExpired || isAuthorizing) return;
    onAuthorize(proposal.proposalId, selectedMethodId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl p-6 bg-background/95 backdrop-blur-xl border-glass-border">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <DialogTitle className="text-lg font-bold">Human Authorization Gate</DialogTitle>
            </div>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="size-3" /> Verified Merchant Checkout
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Zero-Trust Policy: Review live cart figures and choose a saved payment method.
            AgentPay never accesses your raw card numbers, CVVs, or OTPs.
          </DialogDescription>
        </DialogHeader>

        {/* Expiration Warning Banner */}
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-xs font-mono border ${
            hasExpired
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : timeLeft < 60
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-muted/40 border-border/60 text-muted-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="size-3.5" />
            {hasExpired ? "Proposal Expired" : "Authorization Window Closes In:"}
          </span>
          <span className="font-bold text-sm tracking-wider">
            {hasExpired ? "0:00 (Void)" : timeFormatted}
          </span>
        </div>

        {/* Verified Merchant & Domain Box */}
        <div className="rounded-xl border border-glass-border bg-glass/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Merchant Partner</span>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
              <CheckCircle2 className="size-3" /> Domain Authenticated
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-surface-deep flex items-center justify-center text-primary font-bold">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{proposal.merchant.name}</p>
              <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                https://www.{proposal.merchant.domain} <ExternalLink className="size-3" />
              </p>
            </div>
          </div>
        </div>

        {/* Product Details & Live Cart Breakdown */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-start pb-2 border-b border-border/40">
            <div className="min-w-0 pr-2">
              <p className="font-semibold text-foreground text-sm line-clamp-1">{proposal.product.title}</p>
              <p className="text-[11px] text-muted-foreground">Qty: {proposal.product.quantity}</p>
            </div>
            <p className="font-bold text-foreground shrink-0">{formatCurrency(proposal.product.unitPrice)}</p>
          </div>

          <div className="space-y-1.5 text-muted-foreground pt-1">
            <div className="flex justify-between">
              <span>Cart Subtotal</span>
              <span className="text-foreground">{formatCurrency(proposal.financials.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping &amp; Delivery</span>
              <span className="text-foreground">
                {proposal.financials.shipping === 0 ? "FREE" : formatCurrency(proposal.financials.shipping)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Taxes &amp; GST</span>
              <span className="text-foreground">{formatCurrency(proposal.financials.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-foreground pt-2 border-t border-border/60">
              <span className="text-emerald-400">Final Payable Amount</span>
              <span className="text-emerald-400 text-base">{formatCurrency(proposal.financials.total)}</span>
            </div>
          </div>
        </div>

        {/* Saved Payment Method Selection (Masked Only) */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CreditCard className="size-3.5 text-primary" />
            Select Merchant Saved Payment Method
          </Label>
          <RadioGroup value={selectedMethodId} onValueChange={setSelectedMethodId} className="space-y-2">
            {proposal.availablePaymentMethods.map((pm) => (
              <label
                key={pm.id}
                htmlFor={pm.id}
                className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                  selectedMethodId === pm.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RadioGroupItem value={pm.id} id={pm.id} />
                  <span className="font-mono font-medium">{pm.maskedIdentifier}</span>
                </div>
                {pm.isDefault && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                    Default
                  </span>
                )}
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Budget Impact Verification */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-1 font-mono">
          <div className="flex justify-between text-muted-foreground">
            <span>Corporate Budget Check:</span>
            <span className={proposal.budgetImpact.isWithinBudget ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {proposal.budgetImpact.isWithinBudget ? "✓ Within Policy Cap" : "⚠ Exceeds Budget"}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Budget Ceiling: {formatCurrency(proposal.budgetImpact.budgetLimit)}</span>
            <span>Remaining after order: {formatCurrency(proposal.budgetImpact.remainingBudget)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="glass" size="default" onClick={onCancel} className="flex-1 cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            size="default"
            disabled={hasExpired || isAuthorizing || !proposal.budgetImpact.isWithinBudget}
            onClick={handleConfirm}
            className="flex-1 font-semibold cursor-pointer bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center justify-center gap-2"
          >
            {isAuthorizing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Authorizing in Browser...
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" /> Authorize Merchant Checkout
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

