import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Command as CommandIcon, KeyRound, Moon, Sparkles, Sun, Wallet, MapPin } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/lib/theme";
import { configQuery } from "@/lib/agentpay/api";
import { BOTTOM_NAV, MAIN_NAV } from "./nav";
import { PulseDot } from "./primitives";
import { SetupProvider, useSetup } from "./SetupDialog";
import { AddressVaultDialog } from "./AddressVaultDialog";

const ALL = [...MAIN_NAV, ...BOTTOM_NAV];

function Brand() {
  const { data: cfg } = useQuery(configQuery);
  const isConnected = cfg?.services?.paypal?.status === "connected";

  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-1 py-1.5">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground shadow-glow">
        <Wallet className="size-4" />
      </div>
      <div className="min-w-0 group-data-[collapsible=icon]:hidden">
        <p className="text-sm font-semibold leading-none tracking-tight">AgentPay <span className="text-primary">2.0</span></p>
        <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <PulseDot tone={isConnected ? "success" : "warning"} />
          {isConnected ? "Sandbox Connected" : "Awaiting setup"}
        </p>
      </div>
    </Link>
  );
}

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { open } = useSetup();
  const [addressOpen, setAddressOpen] = useState(false);
  const item = (n: (typeof ALL)[number]) => (
    <SidebarMenuItem key={n.to}>
      <SidebarMenuButton asChild isActive={path === n.to} tooltip={n.label}>
        <Link to={n.to}><n.icon /><span>{n.label}</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader><Brand /></SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{MAIN_NAV.map(item)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {item(BOTTOM_NAV[0])}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Address Vault" onClick={() => setAddressOpen(true)}>
                <MapPin /><span>Address Vault</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sandbox Setup" onClick={open}><KeyRound /><span>Sandbox Setup</span></SidebarMenuButton>
            </SidebarMenuItem>
            {item(BOTTOM_NAV[1])}
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Workspace">
                <div className="grid size-7 shrink-0 place-items-center rounded-md bg-accent font-mono text-[11px] font-semibold text-accent-foreground">AP</div>
                <div className="min-w-0 text-left leading-tight">
                  <p className="truncate text-xs font-medium">Shared workspace</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">sandbox</p>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <AddressVaultDialog open={addressOpen} onOpenChange={setAddressOpen} />
    </>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "warning" | "success" }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-md border border-glass-border bg-glass px-2 py-1 font-mono text-[10px] text-muted-foreground lg:inline-flex">
      <span className={tone === "success" ? "size-1.5 rounded-full bg-success" : "size-1.5 rounded-full bg-warning"} />{label}
    </span>
  );
}

function TopBar({ onCommand }: { onCommand: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = ALL.find((n) => n.to === path)?.label ?? "Page";
  const { theme, toggle } = useTheme();
  const { open } = useSetup();
  const { data: cfg } = useQuery(configQuery);
  const ppStatus = cfg?.services?.paypal?.status === "connected";
  const apiStatus = cfg?.services?.serpapi?.status === "connected" && cfg?.services?.groq?.status === "connected";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-glass-border bg-background/70 px-3 backdrop-blur-xl md:px-5">
      <SidebarTrigger />
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden text-muted-foreground sm:inline">AgentPay</span>
        <span className="hidden text-muted-foreground/50 sm:inline">/</span>
        <span className="truncate font-medium">{current}</span>
      </nav>
      <span className="ml-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-400">SANDBOX</span>
      <div className="ml-auto flex items-center gap-1.5">
        <StatusChip label={ppStatus ? "PayPal · Sandbox" : "PayPal · not linked"} tone={ppStatus ? "success" : "warning"} />
        <StatusChip label={apiStatus ? "APIs · Connected" : "API · not configured"} tone={apiStatus ? "success" : "warning"} />
        <StatusChip label="Zomato MCP · Active" tone="success" />
        <Button variant="ghost" size="sm" onClick={onCommand} className="hidden gap-2 text-muted-foreground md:inline-flex">
          <CommandIcon className="size-3.5" /><span className="font-mono text-[11px]">⌘K</span>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle light and dark theme">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </motion.span>
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
        </Tooltip>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications"><Bell className="size-4" /></Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 text-sm">
            <p className="font-medium">Notifications</p>
            <p className="mt-1 text-muted-foreground">No notifications yet.</p>
          </PopoverContent>
        </Popover>
        <Button variant="brand" size="sm" onClick={open}><KeyRound className="size-3.5" /><span className="hidden sm:inline">Setup / Keys</span></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 grid size-8 place-items-center rounded-full bg-accent font-mono text-[11px] font-semibold text-accent-foreground" aria-label="User menu">AP</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Shared workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/connections">API Connections</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={toggle}>Switch to {theme === "dark" ? "light" : "dark"} mode</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [cmd, setCmd] = useState(false);
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { toggle } = useTheme();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmd((v) => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative min-w-0 overflow-hidden bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 ambient ambient-drift" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-grid [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <TopBar onCommand={() => setCmd(true)} />
        <AnimatePresence mode="wait">
          <motion.main key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="relative z-10 mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8">
            {children}
          </motion.main>
        </AnimatePresence>
      </SidebarInset>
      <CommandDialog open={cmd} onOpenChange={setCmd}>
        <CommandInput placeholder="Jump to…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">
            {ALL.map((n) => (
              <CommandItem key={n.to} onSelect={() => { setCmd(false); navigate({ to: n.to }); }}>
                <n.icon className="mr-2 size-4" />{n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { setCmd(false); toggle(); }}><Sparkles className="mr-2 size-4" />Toggle theme</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <SetupProvider><Shell>{children}</Shell></SetupProvider>;
}
