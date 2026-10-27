import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getConfig, type AppConfig } from "@/lib/agentpay.functions";
import { CopyButton } from "./CopyButton";
import { EnvironmentStatus } from "./Header";

export function SandboxSetupModal({
  open,
  onOpenChange,
  config,
  onRefreshed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  config: AppConfig | undefined;
  onRefreshed: (c: AppConfig) => void;
}) {
  const check = useServerFn(getConfig);
  const [checking, setChecking] = useState(false);
  const step = (n: string, title: string, body: React.ReactNode) => (
    <li className="grid grid-cols-[28px_1fr] gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <span className="font-mono text-xs text-signal">{n}</span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="mt-1.5 space-y-2 text-sm text-muted-foreground">{body}</div>
      </div>
    </li>
  );
  const env =
    "PAYPAL_CLIENT_ID=your_sandbox_client_id\nPAYPAL_CLIENT_SECRET=your_sandbox_client_secret\nPAYPAL_ENV=sandbox";
  const link = (href: string, label: string) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-foreground underline underline-offset-4"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="liquid-glass max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">PayPal Sandbox setup</DialogTitle>
          <DialogDescription>
            Connect real Sandbox credentials. Sandbox payments never move real money.
          </DialogDescription>
        </DialogHeader>
        <ol className="mt-2 space-y-4">
          {step(
            "01",
            "Create a Sandbox app",
            <p>
              Open the{" "}
              {link("https://developer.paypal.com/dashboard/", "PayPal Developer Dashboard")},
              switch to <b className="text-foreground">Sandbox</b>, then Apps &amp; Credentials →
              Create App.
            </p>,
          )}
          {step(
            "02",
            "Configure credentials",
            <>
              <p>
                <b className="text-foreground">Client ID</b> — public identifier used by the PayPal
                buttons in the browser.
              </p>
              <p>
                <b className="text-foreground">Client Secret</b> — private, used only by the
                AgentPay server. It is never sent to the browser.
              </p>
              <div className="relative surface-navy rounded-lg p-3 pr-10 font-mono text-xs">
                <pre className="whitespace-pre-wrap">{env}</pre>
                <div className="absolute right-2 top-2">
                  <CopyButton value={env} label="Copy example" />
                </div>
              </div>
              <p>
                Ask in chat to add these as secure project secrets — they are not stored in code.
              </p>
            </>,
          )}
          {step(
            "03",
            "Sandbox Test Buyer Credentials",
            <div className="space-y-2">
              <p>
                Sign in with this pre-configured <b className="text-foreground">Personal</b> sandbox buyer in the PayPal approval window:
              </p>
              <div className="surface-navy rounded-lg p-2.5 font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground select-all">sb-o4oe4753419327@personal.example.com</span>
                    <CopyButton value="sb-o4oe4753419327@personal.example.com" label="Copy Email" />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-line/40 pt-1.5">
                  <span className="text-muted-foreground">Password:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground select-all font-bold">9-"$7b(E</span>
                    <CopyButton value='9-"$7b(E' label="Copy Password" />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tip: Press <kbd className="rounded bg-surface px-1 py-0.5 font-mono text-[10px] text-foreground">F9</kbd> to type email, <kbd className="rounded bg-surface px-1 py-0.5 font-mono text-[10px] text-foreground">F10</kbd> to type password.
              </p>
            </div>,
          )}
          {step(
            "04",
            "Verify the backend",
            <>
              <p>
                This project has no separate backend folder, so the CLI command is not available.
                Use the in-app check instead — it requests a real OAuth token from PayPal Sandbox.
              </p>
              <button
                disabled={checking}
                onClick={async () => {
                  setChecking(true);
                  try {
                    onRefreshed(await check());
                  } finally {
                    setChecking(false);
                  }
                }}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {checking ? "Verifying…" : "Verify connection"}
              </button>
            </>,
          )}
          {step(
            "05",
            "Connection status",
            <>
              <EnvironmentStatus config={config} />
              {config?.message && <p className="text-warning">{config.message}</p>}
            </>,
          )}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
