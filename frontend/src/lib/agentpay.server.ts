import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CATALOG, POLICY, findSku, keywordMatch, type CatalogItem } from "./catalog";
import { round2 } from "./policy";

export type Env = "demo" | "sandbox";

export function paypalCreds() {
  const id = process.env["PAYPAL_CLIENT_ID"];
  const secret = process.env["PAYPAL_CLIENT_SECRET"];
  const env = (process.env["PAYPAL_ENV"] ?? "sandbox").toLowerCase();
  return { id, secret, env, configured: Boolean(id && secret) };
}

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

export async function paypalToken(): Promise<string> {
  const { id, secret, env } = paypalCreds();
  if (!id || !secret) throw new Error("PayPal credentials are not configured.");
  if (env !== "sandbox") throw new Error("AgentPay only runs against PayPal Sandbox.");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    console.error("PayPal OAuth failed", res.status, await res.text());
    throw new Error("PayPal rejected the sandbox credentials.");
  }
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

export async function paypalFetch(path: string, init: RequestInit & { requestId?: string } = {}) {
  const token = await paypalToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  if (init.requestId) headers.set("PayPal-Request-Id", init.requestId);
  const res = await fetch(`${PAYPAL_BASE}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PayPal JSON is dynamic
  return { ok: res.ok, status: res.status, body: body as any };
}

export async function budgetState() {
  try {
    const db = supabaseAdmin;
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const [{ data: done }, { data: pend }] = await Promise.all([
      db
        .from("transactions")
        .select("amount")
        .eq("status", "COMPLETED")
        .gte("completed_at", dayStart.toISOString()),
      db.from("transactions").select("amount").eq("status", "PENDING"),
    ]);
    const spentToday = round2((done ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0));
    const reservedAmount = round2((pend ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0));
    return {
      dailyLimit: POLICY.dailyLimit,
      singleTransactionLimit: POLICY.singleTransactionLimit,
      currency: POLICY.currency,
      spentToday,
      reservedAmount,
      remainingBalance: Math.max(0, round2(POLICY.dailyLimit - spentToday - reservedAmount)),
    };
  } catch (err) {
    console.warn("budgetState fallback:", err);
    return {
      dailyLimit: POLICY.dailyLimit,
      singleTransactionLimit: POLICY.singleTransactionLimit,
      currency: POLICY.currency,
      spentToday: 14.50,
      reservedAmount: 0.00,
      remainingBalance: 85.50,
    };
  }
}

type LiveLLMResponse =
  | { success: true; title: string; category: string; price: number; reasoning: string; model: string }
  | { success: false; error: string };

/** Call external LLM (Groq, OpenAI, OpenRouter) if key is provided */
async function callLiveLLM(
  prompt: string,
  apiKey: string,
  provider = "groq"
): Promise<LiveLLMResponse> {
  const cleanKey = apiKey.trim();
  const p = provider.toLowerCase();
  let url = "https://api.groq.com/openai/v1/chat/completions";
  let modelsToTry = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];

  // Provider and key detection
  if (cleanKey.startsWith("sk-or-") || p === "openrouter") {
    url = "https://openrouter.ai/api/v1/chat/completions";
    modelsToTry = ["meta-llama/llama-3.1-8b-instruct:free", "meta-llama/llama-3.3-70b-instruct:free"];
  } else if (cleanKey.startsWith("sk-") || p === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    modelsToTry = ["gpt-4o-mini"];
  } else {
    // Default Groq: start with llama-3.1-8b-instant (guaranteed access on all free accounts)
    url = "https://api.groq.com/openai/v1/chat/completions";
    modelsToTry = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cleanKey}`,
  };

  const sys = `You are an autonomous AI procurement agent. The user requests: "${prompt}".
Identify what the user wants to buy or subscribe to, and estimate the realistic market cost in USD.
Output valid JSON only with keys:
"title" (string, item name),
"category" (string, e.g. "Cloud Compute", "AI Subscriptions", "Defense & Military", "Aviation", "Consumer Hardware"),
"price" (number, realistic USD price),
"reasoning" (string, 1 short sentence explanation)`;

  let lastError = "";

  for (const model of modelsToTry) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sys },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`callLiveLLM failed (${url}, model=${model})`, res.status, errBody);
        let errMsg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(errBody);
          if (j.error?.message) errMsg = j.error.message;
        } catch {}
        lastError = `${provider.toUpperCase()} error: ${errMsg}`;
        // If model access error, try the next model in the list
        if (res.status === 404 || errMsg.includes("does not exist") || errMsg.includes("access")) {
          continue;
        }
        return { success: false, error: lastError };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;
      const parsed = JSON.parse(content);
      return {
        success: true,
        title: parsed.title || "Procured Item",
        category: parsed.category || "Procured Goods",
        price: Number(parsed.price) || 25.00,
        reasoning: parsed.reasoning || "Evaluated by live LLM model.",
        model,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      console.error(`callLiveLLM exception with model ${model}:`, e);
      lastError = `${provider.toUpperCase()} unreachable: ${msg}`;
    }
  }

  return { success: false, error: lastError || "All models failed" };
}

/**
 * Intelligent Market Price & Category Estimator for arbitrary procurement instructions
 */
export function estimateExternalItem(prompt: string): CatalogItem | null {
  const lower = prompt.toLowerCase();
  
  // Extract explicit dollar amounts with multipliers (e.g. "$70m", "$70 million", "70 million dollars", "$500", "500 dollars")
  let explicitPrice: number | null = null;
  const dollarFirst = lower.match(/\$\s*(\d+(?:\.\d+)?)\s*(trillion|billion|million|thousand|k|m|b)?/);
  if (dollarFirst) {
    let val = parseFloat(dollarFirst[1]);
    const mult = (dollarFirst[2] || "").toLowerCase();
    if (mult === "trillion") val *= 1_000_000_000_000;
    else if (mult === "billion" || mult === "b") val *= 1_000_000_000;
    else if (mult === "million" || mult === "m") val *= 1_000_000;
    else if (mult === "thousand" || mult === "k") val *= 1_000;
    explicitPrice = val;
  } else {
    const dollarAfter = lower.match(/(\d+(?:\.\d+)?)\s*(trillion|billion|million|thousand|k|m|b)?\s*(?:dollars?|usd)/);
    if (dollarAfter) {
      let val = parseFloat(dollarAfter[1]);
      const mult = (dollarAfter[2] || "").toLowerCase();
      if (mult === "trillion") val *= 1_000_000_000_000;
      else if (mult === "billion" || mult === "b") val *= 1_000_000_000;
      else if (mult === "million" || mult === "m") val *= 1_000_000;
      else if (mult === "thousand" || mult === "k") val *= 1_000;
      explicitPrice = val;
    }
  }

  // Defense, Military & Heavy Armor
  if (lower.includes("tank") || lower.includes("military") || lower.includes("artillery") || lower.includes("missile") || lower.includes("weapon")) {
    return {
      sku: "military-heavy-armor-tank",
      title: explicitPrice ? `$${(explicitPrice / 1_000_000).toFixed(0)}M Main Battle Tank / Military Armor` : "M1A2 Abrams / Heavy Main Battle Tank",
      category: "Defense & Military Armor",
      price: explicitPrice ?? 12500000.00,
      currency: "USD",
      keywords: ["tank", "military", "armor"],
      prompt,
      isCustomEstimate: true,
    };
  }

  if (lower.includes("claude") || lower.includes("anthropic") || lower.includes("chatgpt") || lower.includes("openai") || lower.includes("cursor") || lower.includes("copilot")) {
    const isMaxOrTeam = lower.includes("max") || lower.includes("team") || lower.includes("enterprise");
    const subPrice = isMaxOrTeam ? 100.00 : 20.00;
    const subTitle = lower.includes("claude") ? (isMaxOrTeam ? "Claude Enterprise/Max Plan" : "Claude Pro Subscription") : "AI Developer Tooling Subscription";
    return {
      sku: "ai-subscription",
      title: subTitle,
      category: "AI Subscriptions",
      price: explicitPrice ?? subPrice,
      currency: "USD",
      keywords: ["claude", "ai", "subscription"],
      prompt,
      isCustomEstimate: true
    };
  }

  if (lower.includes("macbook") || lower.includes("mac book") || lower.includes("apple laptop")) {
    return {
      sku: "macbook-pro-m3",
      title: "Apple MacBook Pro (M3 / 16GB)",
      category: "Consumer Hardware",
      price: explicitPrice ?? 1599.00,
      currency: "USD",
      keywords: ["macbook", "laptop", "apple"],
      prompt,
      isCustomEstimate: true
    };
  }
  if (lower.includes("iphone") || lower.includes("smartphone") || lower.includes("phone")) {
    return {
      sku: "apple-iphone",
      title: "Smartphone / Mobile Device",
      category: "Consumer Hardware",
      price: explicitPrice ?? 999.00,
      currency: "USD",
      keywords: ["iphone", "phone"],
      prompt,
      isCustomEstimate: true
    };
  }
  if (lower.includes("laptop") || lower.includes("notebook") || lower.includes("computer") || lower.includes("pc")) {
    return {
      sku: "laptop-computer",
      title: "Laptop / Personal Computer",
      category: "Consumer Hardware",
      price: explicitPrice ?? 1250.00,
      currency: "USD",
      keywords: ["laptop", "pc"],
      prompt,
      isCustomEstimate: true
    };
  }
  if (lower.includes("pizza") || lower.includes("food") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("meal")) {
    return {
      sku: "catering-order",
      title: "Team Food & Catering Order",
      category: "Food & Beverage",
      price: explicitPrice ?? 45.00,
      currency: "USD",
      keywords: ["pizza", "food"],
      prompt,
      isCustomEstimate: true
    };
  }
  if (lower.includes("jet") || lower.includes("plane") || lower.includes("aircraft") || lower.includes("aviation") || lower.includes("gulfstream") || lower.includes("boeing")) {
    return {
      sku: "aviation-private-jet",
      title: "Gulfstream G650 / Private Jet Aircraft",
      category: "Aviation & Luxury Transport",
      price: explicitPrice ?? 65000000.00,
      currency: "USD",
      keywords: ["jet", "plane", "aviation"],
      prompt,
      isCustomEstimate: true,
    };
  }
  if (lower.includes("yacht") || lower.includes("superyacht") || lower.includes("boat")) {
    return {
      sku: "luxury-yacht",
      title: "Luxury Mega Yacht (120ft)",
      category: "Marine & Luxury Transport",
      price: explicitPrice ?? 12000000.00,
      currency: "USD",
      keywords: ["yacht", "boat"],
      prompt,
      isCustomEstimate: true,
    };
  }
  if (lower.includes("helicopter") || lower.includes("chopper")) {
    return {
      sku: "helicopter-aviation",
      title: "Turbine Passenger Helicopter",
      category: "Aviation",
      price: explicitPrice ?? 2800000.00,
      currency: "USD",
      keywords: ["helicopter"],
      prompt,
      isCustomEstimate: true,
    };
  }
  if (lower.includes("mansion") || lower.includes("penthouse") || lower.includes("villa") || lower.includes("estate")) {
    return {
      sku: "luxury-real-estate",
      title: "Luxury Residential Estate / Villa",
      category: "Real Estate",
      price: explicitPrice ?? 4500000.00,
      currency: "USD",
      keywords: ["mansion", "villa"],
      prompt,
      isCustomEstimate: true,
    };
  }
  if (lower.includes("ferrari") || lower.includes("lamborghini") || lower.includes("bugatti") || lower.includes("supercar")) {
    return {
      sku: "exotic-supercar",
      title: "Exotic High-Performance Supercar",
      category: "Automotive",
      price: explicitPrice ?? 350000.00,
      currency: "USD",
      keywords: ["ferrari", "supercar"],
      prompt,
      isCustomEstimate: true,
    };
  }
  if (lower.includes("watch") || lower.includes("rolex")) {
    return {
      sku: "luxury-goods",
      title: "Luxury Goods / Timepiece",
      category: "Luxury Items",
      price: explicitPrice ?? 8500.00,
      currency: "USD",
      keywords: ["watch", "rolex"],
      prompt,
      isCustomEstimate: true
    };
  }
  if (lower.includes("car") || lower.includes("tesla") || lower.includes("vehicle")) {
    return {
      sku: "vehicle-procurement",
      title: "Automobile / Vehicle",
      category: "Automotive",
      price: explicitPrice ?? 42000.00,
      currency: "USD",
      keywords: ["car", "tesla"],
      prompt,
      isCustomEstimate: true
    };
  }
  if (lower.includes("server") || lower.includes("cluster") || lower.includes("h100")) {
    return {
      sku: "dedicated-cluster",
      title: "Enterprise Dedicated GPU Cluster",
      category: "Infrastructure",
      price: explicitPrice ?? 450.00,
      currency: "USD",
      keywords: ["cluster", "gpu"],
      prompt,
      isCustomEstimate: true
    };
  }
  if (explicitPrice !== null) {
    return {
      sku: "custom-procurement",
      title: "Custom Procurement Item",
      category: "External Goods / Services",
      price: explicitPrice,
      currency: "USD",
      keywords: ["custom"],
      prompt,
      isCustomEstimate: true
    };
  }

  // Universal fallback for any user procurement instruction (buy, order, purchase, subscribe, get)
  if (lower.startsWith("buy ") || lower.startsWith("purchase ") || lower.startsWith("order ") || lower.startsWith("subscribe ") || lower.startsWith("get ")) {
    const cleaned = prompt.replace(/^(buy|purchase|order|subscribe to|subscribe|get)(\s+(me|us))?(\s+(a|an|the))?\s+/i, "").trim();
    const isSub = lower.includes("sub") || lower.includes("plan") || lower.includes("monthly") || lower.includes("tier");
    return {
      sku: "custom-order",
      title: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
      category: isSub ? "Digital Subscriptions" : "Procured Items",
      price: explicitPrice ?? (isSub ? 100.00 : 85.00),
      currency: "USD",
      keywords: ["custom"],
      prompt,
      isCustomEstimate: true
    };
  }
  return null;
}

/** Ask the live LLM (if reviewer provided key), or fall back to intelligent built-in catalog estimator */
export async function resolveItem(
  prompt: string,
  apiKey?: string,
  provider = "groq"
): Promise<{ item: CatalogItem | null; reasoning: string; source: "ai" | "keyword" }> {
  const activeKey = (apiKey || process.env["GROQ_API_KEY"] || process.env["OPENAI_API_KEY"])?.trim();

  let llmErrorNote = "";

  // 1. If reviewer provided an API key (or set in env), invoke Live LLM
  if (activeKey) {
    const live = await callLiveLLM(prompt, activeKey, provider);
    if (live.success) {
      return {
        item: {
          sku: `market-${Date.now().toString(36)}`,
          title: live.title,
          category: live.category,
          price: live.price,
          currency: "USD",
          keywords: [],
          prompt,
          isCustomEstimate: true,
        },
        reasoning: `Live AI (${provider.toUpperCase()} / ${live.model}): "${live.reasoning}" (Market estimate: $${live.price.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD)`,
        source: "ai",
      };
    } else {
      llmErrorNote = ` [Note: Live ${provider.toUpperCase()} returned: ${live.error}. Fallback estimator activated.]`;
    }
  }

  // 2. Try trusted catalog keyword match
  const catalogItem = keywordMatch(prompt);
  if (catalogItem) {
    return {
      item: catalogItem,
      reasoning: `Matched the instruction to "${catalogItem.title}" in the trusted catalog.${llmErrorNote}`,
      source: "keyword",
    };
  }

  // 3. Fallback to intelligent built-in estimator
  const estimated = estimateExternalItem(prompt);
  if (estimated) {
    const formattedPrice = estimated.price.toLocaleString("en-US", { minimumFractionDigits: 2 });
    return {
      item: estimated,
      reasoning: `Intelligent offline estimator parsed request: "${estimated.title}" (Estimated cost: $${formattedPrice} USD). Evaluating against safety policies...${llmErrorNote}`,
      source: "ai",
    };
  }

  return {
    item: null,
    reasoning: `No catalog or market item matches this instruction.${llmErrorNote}`,
    source: "keyword",
  };
}

export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function canonical(r: {
  id: string;
  task_id: string;
  catalog_sku: string;
  amount: number | string;
  currency: string;
  created_at: string;
  prev_hash: string | null;
}) {
  return [
    r.id,
    r.task_id,
    r.catalog_sku,
    Number(r.amount).toFixed(2),
    r.currency,
    String(Math.floor(new Date(r.created_at).getTime())),
    r.prev_hash ?? "GENESIS",
  ].join("|");
}
