import { BrainCircuit, PiggyBank, Scale, ScanSearch, ShieldCheck } from "lucide-react";
import type { AgentName } from "@/lib/agentpay/api";
export const AGENT_ICONS: Record<AgentName, typeof BrainCircuit> = {
  Orchestrator: BrainCircuit, SecurityAgent: ShieldCheck, DiscoveryAgent: ScanSearch, ComparisonAgent: Scale, BudgetAgent: PiggyBank,
};
