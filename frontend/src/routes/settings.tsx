import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { GlassCard, PageHeader, Reveal } from "@/components/app/primitives";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AgentPay 2.0" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Appearance and workspace preferences for AgentPay." },
      { property: "og:title", content: "Settings — AgentPay 2.0" },
      { property: "og:description", content: "AgentPay workspace settings." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { theme, toggle } = useTheme();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Workspace" title="Settings" />
      <Reveal>
        <GlassCard hover={false} className="flex items-center justify-between gap-4 p-6">
          <div><p className="text-sm font-medium">Appearance</p><p className="text-xs text-muted-foreground">Currently {theme} mode. Your choice is remembered on this device.</p></div>
          <Button variant="glass" onClick={toggle}>{theme === "dark" ? <Sun /> : <Moon />}Switch to {theme === "dark" ? "light" : "dark"}</Button>
        </GlassCard>
      </Reveal>
      <Reveal delay={0.05}>
        <GlassCard hover={false} className="p-6">
          <p className="text-sm font-medium">Environment</p>
          <p className="mt-1 text-xs text-muted-foreground">AgentPay runs in <span className="font-mono text-warning">SANDBOX</span>. No real money moves.</p>
        </GlassCard>
      </Reveal>
    </div>
  );
}
