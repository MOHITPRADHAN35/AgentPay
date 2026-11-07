import { searchSerpShopping } from "../integrations/retailers/serpShopping";
import { searchDevServices, DEV_SERVICES_CATALOG } from "../integrations/retailers/developerServices";
import { searchZomatoFood } from "../integrations/mcp/zomatoMcp";
import { rankProducts, compareProducts, type RankingCriteria } from "./rankingService";
import { parseIntentWithLLM, heuristicParseIntent } from "./llmService";
import type { NormalizedProduct, ProductComparisonResult, SearchOptions, ItemType } from "../types/product";

export async function discoverProducts(
  query: string,
  options: SearchOptions = {}
): Promise<{
  products: NormalizedProduct[];
  category: string;
  itemType: ItemType;
  source: string;
}> {
  // 1. Dynamic intent extraction via LLM / Heuristics
  const intent = await parseIntentWithLLM(query);

  let results: NormalizedProduct[] = [];
  let source = "live_provider";

  // 2. Dynamic Discovery Routing based on intent
  if (intent.discoveryStrategy === "ZOMATO_MCP" || intent.itemType === "FOOD_DINING") {
    results = await searchZomatoFood(intent.cleanQuery, {
      limit: options.limit || 8,
      maxBudget: options.maxBudget || intent.targetBudget
    });
    if (results.length > 0) source = "zomato_mcp_server";
  }

  if (results.length === 0 && (intent.discoveryStrategy === "CLOUD_REGISTRY" || intent.discoveryStrategy === "API_DIRECTORY")) {
    results = searchDevServices(intent.cleanQuery);
    if (results.length > 0) source = "developer_cloud_registry";
  }

  // 3. If no cloud matches or if strategy is Google Shopping, query live Google Shopping via SerpApi
  if (results.length === 0 && (intent.discoveryStrategy === "GOOGLE_SHOPPING" || intent.discoveryStrategy === "MARKET_INTELLIGENCE")) {
    results = await searchSerpShopping(intent.cleanQuery, {
      limit: options.limit || 8,
      maxPrice: options.maxBudget || intent.targetBudget
    });
    if (results.length > 0) source = "google_shopping_serp";
  }

  // 4. Fallback search: try broader terms across catalogs if 0 results
  if (results.length === 0) {
    if (intent.itemType === "CLOUD_COMPUTE" || intent.itemType === "HOSTING_DATABASE" || intent.itemType === "API_CREDITS") {
      results = searchDevServices(intent.cleanQuery.split(" ")[0]);
      if (results.length > 0) source = "dev_registry_fallback";
    } else {
      // Try SerpApi with simplified query (e.g. without "buy", "under $1000", etc.)
      const simplified = query.replace(/\b(buy|find|get|purchase|under|below|for|me|a|an|the|\$\d+)\b/gi, "").trim();
      if (simplified && simplified !== query) {
        results = await searchSerpShopping(simplified, { limit: options.limit || 6 });
        if (results.length > 0) source = "google_shopping_simplified";
      }
    }
  }

  // 5. Ranking
  const criteria: RankingCriteria = {
    targetBudget: options.maxBudget || intent.targetBudget,
    preferredMerchant: options.preferredMerchant || intent.preferredMerchant,
    sortBy: options.sortBy || "recommended"
  };

  const ranked = rankProducts(results, criteria);

  return {
    products: ranked,
    category: intent.category,
    itemType: intent.itemType,
    source
  };
}

export function detectCategory(query: string): string {
  const intent = heuristicParseIntent(query);
  return intent.category;
}

export { compareProducts };
