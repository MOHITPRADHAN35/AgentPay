import { KeyRound, ShieldAlert, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SensitiveAuthHandoffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authType: "OTP" | "3DS" | "UPI_PIN" | string;
  merchantName: string;
  onCompleted: () => Promise<void>;
  onCancel: () => void;
  isVerifying: boolean;
}

export function SensitiveAuthHandoffModal({
  open,
  onOpenChange,
  authType,
  merchantName,
  onCompleted,
  onCancel,
  isVerifying,
}: SensitiveAuthHandoffModalProps) {
  const titleMap: Record<string, string> = {
    OTP: "Bank One-Time Password (OTP) Required",
    "3DS": "3-D Secure Banking Verification",
    UPI_PIN: "UPI PIN Entry Required on Merchant Portal",
  };

  const instructionMap: Record<string, string> = {
    OTP: "A verification code was dispatched to your registered phone or bank app. Enter it directly inside the active Google Chrome window.",
    "3DS": "Approve the pending transaction notification inside your banking app or enter your 3DS password in Chrome.",
    UPI_PIN: "Review the payment request on your UPI app or enter your MPIN directly in the official payment gateway frame.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md p-6 bg-background/95 backdrop-blur-xl border-glass-border">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto size-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <KeyRound className="size-6" />
          </div>
          <DialogTitle className="text-lg font-bold">
            {titleMap[authType] || "Sensitive User Authentication Required"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {instructionMap[authType] ||
              "Please complete the sensitive authentication step directly on the official merchant checkout window."}
          </DialogDescription>
        </DialogHeader>

        {/* Zero-Trust Security Guarantee */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-primary font-bold">
            <ShieldAlert className="size-4" /> AgentPay Zero-Trust Guarantee
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Raw card numbers, CVVs, OTPs, and UPI PINs are <b>never intercepted or logged</b> by our autonomous agent.
            Authentication is completed entirely inside {merchantName}&apos;s official merchant security frame.
          </p>
        </div>

        {/* Active Desktop Window Notice */}
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-surface-deep text-xs font-mono text-muted-foreground border border-glass-border">
          <ExternalLink className="size-3.5 text-primary animate-pulse" />
          <span>Active Google Chrome window is open on your screen</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="brand"
            size="default"
            disabled={isVerifying}
            onClick={onCompleted}
            className="w-full h-11 text-sm font-semibold cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-600 to-primary hover:from-blue-500 hover:to-indigo-500 text-white shadow-md flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Verifying with {merchantName}...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> I Have Completed Authentication in Chrome
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isVerifying}
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
