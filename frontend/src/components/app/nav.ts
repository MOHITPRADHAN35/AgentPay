import { Activity, BadgeDollarSign, Bot, Columns3, KeyRound, LayoutDashboard, Receipt, Search, Settings, ShieldCheck, ShoppingBag, Plug } from "lucide-react";

export const MAIN_NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/procurement", label: "Procurement", icon: ShoppingBag },
  { to: "/agents", label: "Agent Activity", icon: Bot },
  { to: "/discovery", label: "Product Discovery", icon: Search },
  { to: "/comparisons", label: "Comparisons", icon: Columns3 },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/audit", label: "Audit Ledger", icon: ShieldCheck },
  { to: "/budget", label: "Budget & Policies", icon: BadgeDollarSign },
] as const;
export const BOTTOM_NAV = [
  { to: "/connections", label: "API Connections", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
export { Activity, KeyRound };
