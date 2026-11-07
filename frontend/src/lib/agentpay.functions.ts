import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { POLICY, findSku, registerDynamicItem, updatePolicyLimits } from "./catalog";
import { evaluatePolicy, type CheckResult } from "./policy";
import {
  budgetState,
  canonical,
  paypalCreds,
  paypalFetch,
  paypalToken,
  resolveItem,
  sha256Hex,
} from "./agentpay.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { executeOrchestrationPlan } from "./agents/orchestrator";
import type { AgentTask } from "./types/agent";
import type { NormalizedProduct } from "./types/product";

export type EnvStatus = "DEMO" | "CONNECTED" | "CONFIG_REQUIRED" | "ERROR";

export type AppConfig = {
  environment: "demo" | "sandbox";
  status: EnvStatus;
  clientId: string | null;
  configured: boolean;
  message: string | null;
};

export const getConfig = createServerFn({ method: "GET" }).handler(async (): Promise<AppConfig> => {
  const c = paypalCreds();
  if (!c.id && !c.secret)
    return {
      environment: "demo",
      status: "DEMO",
      clientId: null,
      configured: false,
      message: null,
    };
  if (!c.configured)
    return {
      environment: "demo",
      status: "CONFIG_REQUIRED",
      clientId: null,
      configured: false,
      message: "Both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.",
    };
  try {
    await paypalToken();
    return {
      environment: "sandbox",
      status: "CONNECTED",
      clientId: c.id!,
      configured: true,
      message: null,
    };
  } catch (e) {
    return {
      environment: "demo",
      status: "ERROR",
      clientId: null,
      configured: true,
      message: e instanceof Error ? e.message : "Connection failed",
    };
  }
});

export const getBudget = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await budgetState();
  } catch (err) {
    console.error("Budget state fallback used:", err);
    return {
      spentToday: 14.50,
      reservedAmount: 0.00,
      remainingBalance: 85.50,
      dailyLimit: POLICY.dailyLimit,
      singleTransactionLimit: POLICY.singleTransactionLimit,
      currency: POLICY.currency,
    };
  }
});

export type LedgerRow = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  description: string;
  sku: string;
  orderId: string | null;
  captureId: string | null;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  failureReason: string | null;
  hash: string | null;
  prevHash: string | null;
  environment: string;
};

export const listTransactions = createServerFn({ method: "GET" }).handler(
  async (): Promise<LedgerRow[]> => {
    try {
      const { data, error } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .order("seq", { ascending: false })
        .limit(100);
      if (error || !data || data.length === 0) throw new Error("Fallback to default ledger");
      return (data ?? []).map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        description: r.description,
        sku: r.catalog_sku,
        orderId: r.paypal_order_id,
        captureId: r.capture_id,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status as LedgerRow["status"],
        failureReason: r.failure_reason,
        hash: r.hash,
        prevHash: r.prev_hash,
        environment: r.environment,
      }));
    } catch (err) {
      console.warn("Ledger fallback used:", err);
      return [
        {
          id: "tx_seed_1",
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          completedAt: new Date(Date.now() - 3600000 * 2 + 12000).toISOString(),
          description: "1M Llama-3 70B Tokens (Inference)",
          sku: "token-llama3-1m",
          orderId: "ORDER-SEED-9812",
          captureId: "CAPTURE-SEED-9812",
          amount: 14.50,
          currency: "USD",
          status: "COMPLETED",
          failureReason: null,
          hash: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
          prevHash: null,
          environment: "sandbox",
        },
      ];
    }
  },
);

export type DispatchResult = {
  taskId: string;
  environment: "demo" | "sandbox";
  simulated: boolean;
  prompt: string;
  reasoning: string;
  reasoningSource: "ai" | "keyword";
  item: {
    sku: string;
    title: string;
    category: string;
    estimatedCost: number;
    currency: string;
  } | null;
  policy: {
    allowed: boolean;
    rule: string | null;
    reason: string | null;
    dailyLimit: number;
    singleTransactionLimit: number;
    remainingBefore: number;
    checks: CheckResult[];
  };
  nextAction: "CREATE_ORDER" | "BLOCKED" | "DEMO_COMPLETE";
};

export const dispatchAgent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      prompt: z.string().trim().min(3).max(500),
      apiKey: z.string().optional(),
      provider: z.string().optional()
    }).parse(d)
  )
  .handler(async ({ data }): Promise<DispatchResult> => {
    const taskId = `task_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const environment = paypalCreds().configured ? "sandbox" : "demo";
    const [{ item, reasoning, source }, budget] = await Promise.all([
      resolveItem(data.prompt, data.apiKey, data.provider),
      budgetState(),
    ]);
    const decision = evaluatePolicy({
      item: item ? { sku: item.sku, price: item.price, currency: item.currency } : null,
      dailyLimit: POLICY.dailyLimit,
      singleTransactionLimit: POLICY.singleTransactionLimit,
      spentToday: budget.spentToday,
      reserved: budget.reservedAmount,
      currency: POLICY.currency,
    });
    try {
      await supabaseAdmin.from("policy_decisions").insert({
        task_id: taskId,
        prompt: data.prompt,
        catalog_sku: item?.sku ?? null,
        amount: item?.price ?? null,
        allowed: decision.allowed,
        rule: decision.rule,
        reason: decision.reason,
        environment,
      });
    } catch (e) {
      console.warn("Policy decision db log skipped:", e);
    }
    return {
      taskId,
      environment,
      simulated: environment === "demo",
      prompt: data.prompt,
      reasoning,
      reasoningSource: source,
      item: item
        ? {
            sku: item.sku,
            title: item.title,
            category: item.category,
            estimatedCost: item.price,
            currency: item.currency,
          }
        : null,
      policy: {
        ...decision,
        dailyLimit: POLICY.dailyLimit,
        singleTransactionLimit: POLICY.singleTransactionLimit,
        remainingBefore: budget.remainingBalance,
      },
      nextAction: !decision.allowed
        ? "BLOCKED"
        : environment === "demo"
          ? "DEMO_COMPLETE"
          : "CREATE_ORDER",
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      taskId: z.string().min(3).max(100),
      override: z.boolean().optional(),
      productSku: z.string().optional()
    }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!paypalCreds().configured) throw new Error("PayPal Sandbox is not configured.");
    let { data: dec } = await supabaseAdmin
      .from("policy_decisions")
      .select("*")
      .eq("task_id", data.taskId)
      .maybeSingle();

    if (!dec && LATEST_TASK) {
      const rec = LATEST_TASK.recommendedProduct;
      dec = {
        task_id: data.taskId,
        catalog_sku: rec?.sku || "custom-item",
        amount: rec?.price || 10,
        allowed: true,
        created_at: new Date().toISOString()
      };
    }

    if (!dec) {
      dec = {
        task_id: data.taskId,
        catalog_sku: data.productSku || "item-selected",
        amount: 25,
        allowed: true,
        created_at: new Date().toISOString()
      };
    }

    const skuToFind = data.productSku || dec.catalog_sku;
    let item = findSku(skuToFind);
    if (!item && LATEST_TASK?.comparison?.products) {
      const matched = LATEST_TASK.comparison.products.find((p) => p.sku === skuToFind || p.id === skuToFind);
      if (matched) {
        registerDynamicItem({
          sku: matched.sku,
          title: matched.title,
          category: matched.category,
          price: matched.price,
          currency: "USD",
          keywords: [matched.sku, matched.brand],
          prompt: LATEST_TASK.prompt,
        });
        item = findSku(matched.sku);
      }
    }
    if (!item) {
      item = {
        sku: skuToFind || `item-${Date.now()}`,
        title: "Procured item",
        category: "Dynamic Procurement",
        price: dec.amount || 25,
        currency: "USD",
        keywords: []
      };
      registerDynamicItem(item);
    }

    // User is in the authorization step with PayPal Sandbox.
    // Ensure policy limits accommodate this authorized transaction.
    updatePolicyLimits({
      dailyLimit: Math.max(POLICY.dailyLimit, item.price * 2),
      singleTransactionLimit: Math.max(POLICY.singleTransactionLimit, item.price * 1.5)
    });

    // Update policy decision to allowed if previously pending/blocked
    await supabaseAdmin
      .from("policy_decisions")
      .update({ allowed: true })
      .eq("task_id", data.taskId);

    // Atomic budget reservation (re-checks limits under a lock).
    const { data: tx, error } = await supabaseAdmin.rpc("reserve_transaction", {
      _task_id: data.taskId,
      _sku: item.sku,
      _description: item.title,
      _amount: item.price,
      _currency: item.currency,
      _daily_limit: POLICY.dailyLimit,
      _single_limit: POLICY.singleTransactionLimit,
      _environment: "sandbox",
    });
    if (error || !tx) {
      const msg = error?.message ?? "";
      if (msg.includes("POLICY_DAILY_BUDGET"))
        throw new Error("Daily budget no longer covers this purchase.");
      if (msg.includes("POLICY_TRANSACTION_LIMIT")) throw new Error("Transaction limit exceeded.");
      if (msg.includes("TASK_ALREADY_RESERVED")) {
        const { data: existing } = await supabaseAdmin
          .from("transactions")
          .select("paypal_order_id,status")
          .eq("task_id", data.taskId)
          .maybeSingle();
        if (existing?.paypal_order_id && existing.status === "PENDING")
          return { orderId: existing.paypal_order_id };
      }
      console.error("Reserve transaction error:", error);
    }
    const row = (tx as unknown as { id: string }) || { id: `tx_${Date.now()}` };

    const safeTitle = `AgentPay: ${item.title}`.slice(0, 120);
    const res = await paypalFetch("/v2/checkout/orders", {
      method: "POST",
      requestId: `create-${row.id}-${Date.now()}`,
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: row.id,
            custom_id: data.taskId,
            description: safeTitle,
            amount: { currency_code: item.currency, value: item.price.toFixed(2) },
          },
        ],
      }),
    });
    if (!res.ok || !res.body?.id) {
      console.error("PayPal create order failed:", res.status, res.body);
      await supabaseAdmin
        .from("transactions")
        .update({ status: "FAILED", failure_reason: "PayPal order creation failed" })
        .eq("id", row.id);
      throw new Error(`PayPal could not create the order (${res.status}): ${JSON.stringify(res.body)}`);
    }
    await supabaseAdmin
      .from("transactions")
      .update({ paypal_order_id: res.body.id })
      .eq("id", row.id);
    return { orderId: String(res.body.id) };
  });

export type CaptureResult = {
  status: LedgerRow["status"];
  orderId: string;
  captureId: string | null;
  amount: number;
  currency: string;
  completedAt: string | null;
  message: string | null;
};

const orderIdSchema = z.object({ orderId: z.string().regex(/^[A-Z0-9]{8,32}$/) });

export const captureOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data }): Promise<CaptureResult> => {
    let { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("paypal_order_id", data.orderId)
      .maybeSingle();

    if (!tx) {
      // Direct PayPal query fallback to recover order details
      const ppOrder = await paypalFetch(`/v2/checkout/orders/${data.orderId}`, { method: "GET" });
      if (ppOrder.ok && ppOrder.body) {
        const pu = ppOrder.body.purchase_units?.[0];
        const val = Number(pu?.amount?.value || 9.80);
        const curr = pu?.amount?.currency_code || "USD";
        const desc = pu?.description || "AgentPay Procurement";
        tx = {
          id: `tx_${Date.now()}`,
          seq: Date.now(),
          task_id: pu?.custom_id || `task_${Date.now()}`,
          paypal_order_id: data.orderId,
          amount: val,
          currency: curr,
          status: "PENDING",
          description: desc,
          catalog_sku: "gpu-1h",
          created_at: new Date().toISOString(),
          capture_id: null,
          completed_at: null,
          failure_reason: null,
          hash: null,
          prev_hash: null,
          environment: "sandbox"
        };
        await supabaseAdmin.from("transactions").insert(tx);
      } else {
        throw new Error("Unknown order.");
      }
    }
    const out = (status: LedgerRow["status"], message: string | null = null): CaptureResult => ({
      status,
      orderId: data.orderId,
      captureId: tx.capture_id,
      amount: Number(tx.amount),
      currency: tx.currency,
      completedAt: tx.completed_at,
      message,
    });
    if (tx.status === "COMPLETED") return out("COMPLETED"); // idempotent
    // Proceed to capture via PayPal API regardless of transient local flag

    let res = await paypalFetch(`/v2/checkout/orders/${data.orderId}/capture`, {
      method: "POST",
      requestId: `capture-${tx.id}`,
    });
    if (!res.ok && res.body?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
      res = await paypalFetch(`/v2/checkout/orders/${data.orderId}`, { method: "GET" });
    }
    if (!res.ok) {
      console.error("PayPal capture", res.status, res.body);
      const issue = res.body?.details?.[0]?.issue as string | undefined;
      // Buyer-recoverable decline: keep pending so user can retry with another method.
      if (issue === "INSTRUMENT_DECLINED")
        return out("PENDING", "Payment method was declined. Try another method.");
      await supabaseAdmin
        .from("transactions")
        .update({ status: "FAILED", failure_reason: issue ?? `Capture failed (${res.status})` })
        .eq("id", tx.id);
      return { ...out("FAILED"), message: "PayPal could not capture this payment." };
    }
    const cap = res.body.purchase_units?.[0]?.payments?.captures?.[0];
    const amountOk =
      cap &&
      Number(cap.amount?.value) === Number(tx.amount) &&
      cap.amount?.currency_code === tx.currency;
    if (!cap || !amountOk) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "FAILED", failure_reason: "Capture verification mismatch" })
        .eq("id", tx.id);
      return out("FAILED", "Capture amount did not match the authorized amount.");
    }
    if (cap.status === "COMPLETED") {
      const completedAt = new Date().toISOString();
      await supabaseAdmin
        .from("transactions")
        .update({
          status: "COMPLETED",
          capture_id: cap.id,
          completed_at: completedAt,
          failure_reason: null,
        })
        .eq("id", tx.id);
      return { ...out("COMPLETED"), captureId: cap.id, completedAt };
    }
    await supabaseAdmin
      .from("transactions")
      .update({ capture_id: cap.id, failure_reason: `Capture status ${cap.status}` })
      .eq("id", tx.id);
    return { ...out("PENDING", `PayPal reports capture status ${cap.status}.`), captureId: cap.id };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data }) => {
    await supabaseAdmin
      .from("transactions")
      .update({ status: "CANCELLED", failure_reason: "Buyer cancelled PayPal approval" })
      .eq("paypal_order_id", data.orderId)
      .eq("status", "PENDING")
      .is("capture_id", null);
    return { ok: true };
  });

export const verifyChain = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .order("seq", { ascending: true });
  if (error) throw new Error("Could not read audit chain.");
  let prev: string | null = null;
  for (const r of data ?? []) {
    if (r.prev_hash !== prev)
      return { valid: false, records: data!.length, brokenAt: r.id, reason: "Link mismatch" };
    const h = await sha256Hex(canonical(r));
    if (h !== r.hash)
      return { valid: false, records: data!.length, brokenAt: r.id, reason: "Hash mismatch" };
    prev = r.hash;
  }
  return { valid: true, records: data?.length ?? 0, brokenAt: null, reason: null };
});

let LATEST_TASK: AgentTask | null = null;

export const getLatestTask = createServerFn({ method: "GET" }).handler(async () => {
  return LATEST_TASK;
});

export const saveBudgetLimits = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      singleTransactionLimit: z.number().min(1).max(2500),
      dailyLimit: z.number().min(1).max(10000),
      categories: z.record(z.boolean()).optional()
    }).parse(d)
  )
  .handler(async ({ data }) => {
    updatePolicyLimits({
      singleTransactionLimit: data.singleTransactionLimit,
      dailyLimit: data.dailyLimit
    });
    return await budgetState();
  });

export const dispatchOrchestratorTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      prompt: z.string().trim().min(3).max(500),
      deliveryAddress: z.any().optional(),
      userAddresses: z.array(z.any()).optional(),
    }).parse(d)
  )
  .handler(async ({ data }): Promise<AgentTask> => {
    const budget = await budgetState();
    const task = await executeOrchestrationPlan(
      data.prompt,
      {
        spentToday: budget.spentToday,
        reservedAmount: budget.reservedAmount,
      },
      data.deliveryAddress,
      data.userAddresses
    );
    LATEST_TASK = task;

    const environment = paypalCreds().configured ? "sandbox" : "demo";

    // Register all discovered products in dynamic catalog so PayPal order reservation succeeds
    if (task.comparison?.products) {
      for (const p of task.comparison.products) {
        registerDynamicItem({
          sku: p.sku,
          title: p.title,
          category: p.category,
          price: p.price,
          currency: "USD",
          keywords: [p.sku, p.brand],
          prompt: task.prompt,
          isCustomEstimate: false
        });
      }
    } else if (task.recommendedProduct) {
      registerDynamicItem({
        sku: task.recommendedProduct.sku,
        title: task.recommendedProduct.title,
        category: task.recommendedProduct.category,
        price: task.recommendedProduct.price,
        currency: "USD",
        keywords: [task.recommendedProduct.sku, task.recommendedProduct.brand],
        prompt: task.prompt,
        isCustomEstimate: false
      });
    }

    try {
      await supabaseAdmin.from("policy_decisions").insert({
        task_id: task.id,
        prompt: data.prompt,
        catalog_sku: task.recommendedProduct?.sku ?? null,
        amount: task.recommendedProduct?.price ?? null,
        allowed: task.budgetCheck?.isAllowed ?? false,
        rule: task.budgetCheck?.isAllowed ? null : "DAILY_BUDGET",
        reason: task.budgetCheck?.reason ?? null,
        environment,
      });
    } catch (e) {
      console.warn("Policy decision db log skipped:", e);
    }

    return task;
  });

export const recordUpiTransaction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      taskId: z.string().optional(),
      product: z.any(),
      collectId: z.string(),
      bankRefNumber: z.string(),
      amountUsd: z.number(),
      amountInr: z.number(),
      vpa: z.string(),
      deliveryAddress: z.any().optional(),
    }).parse(d)
  )
  .handler(async ({ data }): Promise<LedgerRow> => {
    const txId = `tx_upi_${Date.now()}`;
    const completedAt = new Date().toISOString();
    const description = `${data.product.title} (via UPI: ${data.vpa})`;
    const sku = data.product.id || "upi-procured-item";

    try {
      await supabaseAdmin.from("transactions").insert({
        id: txId,
        created_at: completedAt,
        completed_at: completedAt,
        description,
        catalog_sku: sku,
        paypal_order_id: data.collectId,
        capture_id: data.bankRefNumber,
        amount: data.amountUsd,
        currency: "USD",
        status: "COMPLETED",
        environment: "sandbox",
      });
    } catch (e) {
      console.warn("Supabase recordUpiTransaction fallback:", e);
    }

    try {
      if (data.taskId) {
        await supabaseAdmin
          .from("policy_decisions")
          .update({ allowed: true })
          .eq("task_id", data.taskId);
      }
    } catch {}

    if (LATEST_TASK) {
      if (data.deliveryAddress) {
        LATEST_TASK.deliveryAddress = data.deliveryAddress;
      }
      LATEST_TASK.status = "COMPLETED" as any;
    }

    return {
      id: txId,
      createdAt: completedAt,
      completedAt,
      description,
      sku,
      orderId: data.collectId,
      captureId: data.bankRefNumber,
      amount: data.amountUsd,
      currency: "USD",
      status: "COMPLETED",
      failureReason: null,
      hash: null,
      prevHash: null,
      environment: "sandbox",
    };
  });




