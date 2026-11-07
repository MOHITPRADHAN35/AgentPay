import type { NormalizedProduct, ProductComparisonResult } from "./product";
import type { UserAddress } from "./address";

export type AgentRole = "Orchestrator" | "DiscoveryAgent" | "ComparisonAgent" | "BudgetAgent" | "SecurityAgent";

export interface AgentActivityEvent {
  id: string;
  taskId: string;
  agent: AgentRole;
  action: string;
  status: "STARTING" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED";
  details: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface AgentTask {
  id: string;
  prompt: string;
  category: "Consumer Commerce" | "Developer & Business Procurement" | "Food & Dining Delivery" | string;
  status: "PLANNING" | "DISCOVERING" | "COMPARING" | "EVALUATING_BUDGET" | "READY_FOR_APPROVAL" | "FAILED" | "REJECTED";
  targetBudget?: number;
  currency: string;
  plan: string[];
  recommendedProduct?: NormalizedProduct;
  deliveryAddress?: UserAddress;
  comparison?: ProductComparisonResult;
  budgetCheck?: {
    isAllowed: boolean;
    reason: string;
    itemPrice: number;
    taxAndShipping: number;
    totalAmount: number;
    remainingBudgetAfter: number;
  };
  securityCheck?: {
    isPassed: boolean;
    flags: string[];
    merchantVerified: boolean;
  };
  activityLogs: AgentActivityEvent[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

