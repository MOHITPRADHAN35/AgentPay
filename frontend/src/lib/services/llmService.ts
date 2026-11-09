import type { ItemType } from "../types/product";

export interface ParsedIntent {
  cleanQuery: string;
  category: string;
  itemType: ItemType;
  discoveryStrategy: "CLOUD_REGISTRY" | "GOOGLE_SHOPPING" | "API_DIRECTORY" | "MARKET_INTELLIGENCE" | "ZOMATO_MCP";
  targetBudget?: number;
  preferredMerchant?: string;
}

export function heuristicParseIntent(query: string): ParsedIntent {
  const q = query.toLowerCase();

  // Extract explicit budget if present (e.g. "under $1200", "under ₹90,000", "under 200 rupees", "under 300", "budget 50 dollars")
  let targetBudget: number | undefined;
  const budgetMatch = query.match(/(?:under|below|max|budget(?:\s*of)?)\s*(?:[\$₹]|usd)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr|usd|\$|bucks)?/i);
  if (budgetMatch && budgetMatch[1]) {
    const rawNum = parseFloat(budgetMatch[1].replace(/,/g, ""));
    const isRupee = query.includes("₹") ||
      /rupees?|rs\.?|inr/i.test(query) ||
      (/(zomato|swiggy|food|noodle|noodles|chowmein|pizza|burger|biryani|pasta)/i.test(q) && !query.includes("$") && !/usd/i.test(query));
    if (isRupee) {
      targetBudget = Math.round((rawNum / 86) * 100) / 100;
    } else {
      targetBudget = rawNum;
    }
  }

  // Food & Dining / Restaurant Delivery (Zomato MCP Server)
  if (/(food|pizza|biryani|burger|sushi|pasta|chowmein|chow\s*mein|noodles?|chinese|hakka|momos|dim\s*sum|rice|fried\s*rice|dosa|idli|paneer|chicken|mutton|curry|thali|dal|naan|roti|sandwich|wrap|roll|kathi|tacos|burrito|snack|dessert|cake|ice\s*cream|beverage|shake|coffee|tea|cafe|breakfast|lunch|dinner|meal|eat|hungry|order\s*food|zomato|swiggy|restaurant|dish|takeaway|cuisine|manchurian|chilli|soup)/i.test(q)) {
    const cleanDish = query
      .replace(/\b(try|ordering|order|buy|get|procure|find|me|a|an|the|from|on|in|using|with|via|zomato|swiggy|please|under|below|for|to|at|my|home|office|hostel|\$\d+|₹\d+|\d+|rupees?|rs\.?|inr|usd|\$|bucks)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return {
      cleanQuery: cleanDish || "noodles",
      category: "Food & Dining Delivery",
      itemType: "FOOD_DINING",
      discoveryStrategy: "ZOMATO_MCP",
      targetBudget,
      preferredMerchant: /zomato/i.test(q) ? "Zomato" : undefined,
    };
  }

  // Cloud Compute & GPU instances
  if (/(h100|a100|rtx 4090|cloud gpu|gpu instance|runpod|lambda labs|vast\.ai|modal|deepinfra|compute hour|cluster)/i.test(q)) {
    return {
      cleanQuery: query.trim(),
      category: "Cloud Compute & Infrastructure",
      itemType: "CLOUD_COMPUTE",
      discoveryStrategy: "CLOUD_REGISTRY",
      targetBudget,
      preferredMerchant: /runpod/i.test(q) ? "RunPod" : /lambda/i.test(q) ? "Lambda Labs" : undefined,
    };
  }

  // AI Token Credits & Developer APIs
  if (/(token|llm credit|groq|openai|anthropic|together ai|deepseek|api credit|embedding)/i.test(q)) {
    return {
      cleanQuery: query.trim(),
      category: "AI Token Credits & APIs",
      itemType: "API_CREDITS" as any,
      discoveryStrategy: "CLOUD_REGISTRY",
      targetBudget,
      preferredMerchant: /groq/i.test(q) ? "Groq" : undefined,
    };
  }

  // Domains & Hosting
  if (/(domain|ssl|dns|namecheap|cloudflare|hosting|vercel|supabase|database)/i.test(q)) {
    return {
      cleanQuery: query.trim(),
      category: "Developer Hosting & Domains",
      itemType: "HOSTING_DATABASE",
      discoveryStrategy: "CLOUD_REGISTRY",
      targetBudget,
      preferredMerchant: /namecheap/i.test(q) ? "Namecheap" : undefined,
    };
  }

  // Hardware: Laptops, peripherals, monitors, devices
  if (/(laptop|macbook|gpu|rtx|thinkpad|notebook|keyboard|monitor|desk|chair|mouse|headphone|desktop|pc)/i.test(q)) {
    return {
      cleanQuery: query.trim(),
      category: "Consumer Hardware & Peripherals",
      itemType: "HARDWARE",
      discoveryStrategy: "GOOGLE_SHOPPING",
      targetBudget,
    };
  }

  // Generic commerce
  return {
    cleanQuery: query.trim(),
    category: "General Commerce & Supplies",
    itemType: "PHYSICAL_GOODS",
    discoveryStrategy: "GOOGLE_SHOPPING",
    targetBudget,
  };
}

export async function parseIntentWithLLM(query: string): Promise<ParsedIntent> {
  // If query mentions food, dining, noodles, chowmein, zomato, swiggy, etc., prioritize ZOMATO_MCP deterministically!
  const isFood = /(food|zomato|swiggy|noodles?|chowmein|chow\s*mein|pizza|burger|biryani|pasta|dosa|thali|manchurian|chilli|momos|sandwich|wrap|meal|dinner|lunch|breakfast|restaurant|dish)/i.test(query);
  if (isFood) {
    return heuristicParseIntent(query);
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return heuristicParseIntent(query);
  }

  try {
    const isGroq = !!(process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY);
    const endpoint = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
    const model = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You are an intent parser for autonomous procurement. Given a user prompt, return a valid JSON object with:
- "cleanQuery": refined search query
- "category": high-level category string ("Food & Dining Delivery", "Cloud Compute", "Consumer Hardware", "AI Token Credits", etc.)
- "itemType": one of "FOOD_DINING", "HARDWARE", "CLOUD_COMPUTE", "DEVELOPER_SERVICE", "HOSTING_DATABASE", "PHYSICAL_GOODS", "GENERAL"
- "discoveryStrategy": one of "ZOMATO_MCP", "CLOUD_REGISTRY", "GOOGLE_SHOPPING", "API_DIRECTORY"
- "targetBudget": number or null if not mentioned.`,
          },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          cleanQuery: parsed.cleanQuery || query.trim(),
          category: parsed.category || "Consumer Hardware",
          itemType: parsed.itemType || "HARDWARE",
          discoveryStrategy: parsed.discoveryStrategy || "GOOGLE_SHOPPING",
          targetBudget: typeof parsed.targetBudget === "number" ? parsed.targetBudget : undefined,
          preferredMerchant: parsed.preferredMerchant,
        };
      }
    }
  } catch {
    // Fall back to fast heuristics if LLM times out or is unreachable
  }

  return heuristicParseIntent(query);
}

