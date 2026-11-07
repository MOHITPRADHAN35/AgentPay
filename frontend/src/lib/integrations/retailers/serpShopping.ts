import { normalizeSerpShoppingItem } from "../../services/productNormalizer";
import type { NormalizedProduct } from "../../types/product";

export async function searchSerpShopping(
  query: string,
  options: { limit?: number; maxPrice?: number } = {}
): Promise<NormalizedProduct[]> {
  const apiKey =
    process.env["SERPAPI_API_KEY"] ||
    process.env["VITE_SERPAPI_API_KEY"] ||
    "240aaf5adbc17abcbd197f3099fff69a0fa03eb34cb4a16244c653e4fa112a2a";
  if (!apiKey) {
    console.warn("SERPAPI_API_KEY not configured, skipping Google Shopping live search.");
    return [];
  }

  const { limit = 8, maxPrice } = options;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_shopping");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(Math.max(limit, 10)));
  url.searchParams.set("gl", "us");
  url.searchParams.set("hl", "en");

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(9000)
    });

    if (!res.ok) {
      console.error("SerpApi request failed:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const rawResults = data.shopping_results || [];

    const products: NormalizedProduct[] = rawResults
      .slice(0, limit)
      .map((item: any) => normalizeSerpShoppingItem(item, query))
      .filter((p: NormalizedProduct) => {
        if (p.price <= 0) return false;
        if (maxPrice && p.price > maxPrice) return false;
        return true;
      });

    return products;
  } catch (err) {
    console.error("SerpApi search error:", err);
    return [];
  }
}

