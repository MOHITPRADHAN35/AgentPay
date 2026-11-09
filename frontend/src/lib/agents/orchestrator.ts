import { AgentTools } from "../tools/agentTools";
import { detectCategory } from "../services/productDiscoveryService";
import { resolveAddressFromPrompt } from "../services/addressService";
import type { AgentTask, AgentActivityEvent } from "../types/agent";
import type { NormalizedProduct } from "../types/product";

export function parsePromptRequirements(prompt: string): {
  cleanQuery: string;
  category: "Consumer Commerce" | "Developer & Business Procurement" | "Food & Dining Delivery" | string;
  targetBudget?: number;
} {
  const category = detectCategory(prompt);

  // Extract explicit budget if present (e.g. "under $900", "under ₹90,000", "under 200 rupees", "budget 50 dollars")
  let targetBudget: number | undefined;
  const budgetMatch = prompt.match(/(?:under|below|max|budget(?:\s*of)?)\s*(?:[\$₹]|usd)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr|usd|\$|bucks)?/i);
  if (budgetMatch) {
    const rawNum = parseFloat(budgetMatch[1].replace(/,/g, ""));
    // Convert ₹ / rupees to approximate USD with 2 decimal precision
    const isRupee = prompt.includes("₹") ||
      /rupees?|rs\.?|inr/i.test(prompt) ||
      (/(zomato|swiggy|food|noodle|noodles|chowmein|pizza|burger|biryani|pasta)/i.test(prompt) && !prompt.includes("$") && !/usd/i.test(prompt));
    if (isRupee) {
      targetBudget = Math.round((rawNum / 86) * 100) / 100;
    } else {
      targetBudget = rawNum;
    }
  }

  const isFood = /(food|zomato|swiggy|noodles?|chowmein|chow\s*mein|pizza|burger|biryani|pasta)/i.test(prompt);
  let cleanQuery = prompt.trim();
  if (isFood) {
    const stripped = prompt
      .replace(/\b(try|ordering|order|buy|get|procure|find|me|a|an|the|from|on|in|using|with|via|zomato|swiggy|please|under|below|for|to|at|my|home|office|hostel|\$\d+|₹\d+|\d+|rupees?|rs\.?|inr|usd|\$|bucks)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped) cleanQuery = stripped;
  }

  return {
    cleanQuery,
    category,
    targetBudget
  };
}

export async function executeOrchestrationPlan(
  prompt: string,
  budgetContext: { spentToday: number; reservedAmount: number } = { spentToday: 14.50, reservedAmount: 0 },
  preferredAddress?: any,
  userAddresses?: any[]
): Promise<AgentTask> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const activityLogs: AgentActivityEvent[] = [];

  const log = (agent: AgentActivityEvent["agent"], action: string, status: AgentActivityEvent["status"], details: string, data?: any) => {
    activityLogs.push({
      id: `act_${Date.now()}_${activityLogs.length}`,
      taskId,
      agent,
      action,
      status,
      details,
      timestamp: new Date().toISOString(),
      data
    });
  };

  const { cleanQuery, category, targetBudget } = parsePromptRequirements(prompt);

  const plan = [
    "1. Security & Intent Analysis: Sanitize input and verify request safety.",
    "2. Product Discovery: Search verified providers for live listings matching specifications.",
    "3. Spec & Value Comparison: Normalize results and benchmark price-to-performance.",
    "4. Budget Verification: Calculate item cost, estimated taxes, and enforce spending limits.",
    "5. Prepare Authorization: Assemble verified purchase package for explicit user approval."
  ];

  log("Orchestrator", "Analyze Intent", "COMPLETED", `Intent parsed: Category "${category}"${targetBudget ? ` with target budget $${targetBudget}` : ""}.`, { cleanQuery, category, targetBudget });

  // Resolve Delivery Destination (Jarvis Address Vault)
  const addressResolution = resolveAddressFromPrompt(prompt, userAddresses);
  const deliveryAddress = (addressResolution.matchedBy === "default_fallback" && preferredAddress)
    ? preferredAddress
    : addressResolution.address;
  log("Orchestrator", "Resolve Destination", "COMPLETED", `Delivery destination resolved: "${deliveryAddress.alias}" (${deliveryAddress.name}, ${deliveryAddress.city} ${deliveryAddress.postalCode}) via ${addressResolution.matchedBy}.`, { deliveryAddress, resolution: addressResolution });

  // Step 1: Security Agent
  log("SecurityAgent", "Evaluate Request", "RUNNING", "Scanning prompt for injection, jailbreaks, and forbidden asset classes...");
  const secEval = AgentTools.checkSecurity(cleanQuery);
  if (!secEval.isSafe) {
    log("SecurityAgent", "Evaluate Request", "BLOCKED", secEval.reason, secEval);
    return {
      id: taskId,
      prompt,
      category,
      status: "REJECTED",
      targetBudget,
      currency: "USD",
      plan,
      securityCheck: {
        isPassed: false,
        flags: secEval.flags,
        merchantVerified: false
      },
      activityLogs,
      createdAt: new Date().toISOString(),
      error: secEval.reason
    };
  }
  log("SecurityAgent", "Evaluate Request", "COMPLETED", "Prompt sanitized. Safe for procurement tool execution.", secEval);

  // Step 2: Discovery Agent
  log("DiscoveryAgent", "Search Providers", "RUNNING", `Querying verified providers for: "${cleanQuery}"...`);
  let products: NormalizedProduct[] = [];
  try {
    products = await AgentTools.searchProducts(cleanQuery, {
      category,
      maxBudget: targetBudget,
      limit: 6
    });
  } catch (err: any) {
    log("DiscoveryAgent", "Search Providers", "FAILED", `Discovery error: ${err.message}`);
  }

  if (products.length === 0) {
    log("DiscoveryAgent", "Search Providers", "FAILED", "No matching products found from providers.");
    return {
      id: taskId,
      prompt,
      category,
      status: "FAILED",
      targetBudget,
      currency: "USD",
      plan,
      activityLogs,
      createdAt: new Date().toISOString(),
      error: "No matching products found matching criteria."
    };
  }

  log("DiscoveryAgent", "Search Providers", "COMPLETED", `Discovered ${products.length} verified listings from merchant sources.`, { count: products.length });

  // Step 3: Comparison Agent
  log("ComparisonAgent", "Benchmark Products", "RUNNING", "Comparing technical specifications, ratings, and price-to-performance...");
  const comparison = AgentTools.compareProducts(products);
  const bestProduct = comparison.products[0];
  log("ComparisonAgent", "Benchmark Products", "COMPLETED", comparison.verdict, { bestOptionId: comparison.bestOptionId });

  // Step 4: Budget Agent
  log("BudgetAgent", "Validate Spending Limits", "RUNNING", `Validating $${bestProduct.price.toFixed(2)} + taxes against daily and single-transaction guardrails...`);
  const budgetCheck = AgentTools.validateBudget(bestProduct, budgetContext.spentToday, budgetContext.reservedAmount);
  if (!budgetCheck.isAllowed) {
    log("BudgetAgent", "Validate Spending Limits", "BLOCKED", budgetCheck.reason, budgetCheck);
  } else {
    log("BudgetAgent", "Validate Spending Limits", "COMPLETED", budgetCheck.reason, budgetCheck);
  }

  // Step 5: Finalize Orchestrator Task
  const finalStatus = budgetCheck.isAllowed ? "READY_FOR_APPROVAL" : "EVALUATING_BUDGET";
  log("Orchestrator", "Package Procurement", "COMPLETED", `Procurement package compiled. ${budgetCheck.isAllowed ? "Awaiting explicit user authorization." : "Requires budget limit override or adjustment."}`);

  return {
    id: taskId,
    prompt,
    category,
    status: finalStatus,
    targetBudget,
    currency: "USD",
    plan,
    recommendedProduct: bestProduct,
    deliveryAddress,
    comparison,
    budgetCheck,
    securityCheck: {
      isPassed: true,
      flags: [],
      merchantVerified: bestProduct.merchant.isVerified
    },
    activityLogs,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };
}

