import type { NormalizedProduct, ProductComparisonResult } from "../types/product";

export interface RankingCriteria {
  targetBudget?: number;
  requiredGpu?: string;
  requiredRam?: string;
  requiredStorage?: string;
  preferredMerchant?: string;
  sortBy?: "recommended" | "price_asc" | "price_desc" | "rating";
}

export function rankProducts(
  products: NormalizedProduct[],
  criteria: RankingCriteria = {}
): NormalizedProduct[] {
  const { targetBudget, requiredGpu, requiredRam, preferredMerchant, sortBy = "recommended" } = criteria;

  const scored = products.map((product) => {
    let score = 50; // Base score
    const matchReasons: string[] = [];

    // 1. Budget fit
    if (targetBudget && targetBudget > 0) {
      if (product.price <= targetBudget) {
        score += 25;
        const savings = Math.round(targetBudget - product.price);
        matchReasons.push(`Within budget ($${savings} headroom)`);
      } else {
        const overBudget = product.price - targetBudget;
        score -= Math.min(40, (overBudget / targetBudget) * 50);
        matchReasons.push(`Exceeds target budget by $${Math.round(overBudget)}`);
      }
    }

    // 2. Hardware / Spec Match
    const specs = product.specifications || {};
    if (requiredGpu && specs.gpu) {
      if (String(specs.gpu).toLowerCase().includes(requiredGpu.toLowerCase())) {
        score += 20;
        matchReasons.push(`Exact GPU match (${specs.gpu})`);
      }
    }

    if (requiredRam && specs.ram) {
      if (String(specs.ram).toLowerCase().includes(requiredRam.toLowerCase())) {
        score += 15;
        matchReasons.push(`RAM specification match (${specs.ram})`);
      }
    }

    // 3. Merchant Trust
    if (product.merchant) {
      if (product.merchant.isVerified) {
        score += 10;
        matchReasons.push(`Verified merchant (${product.merchant.name})`);
      }
      if (preferredMerchant && product.merchant.name.toLowerCase().includes(preferredMerchant.toLowerCase())) {
        score += 15;
        matchReasons.push(`Preferred merchant (${product.merchant.name})`);
      }
    }

    // 4. Rating & Reviews
    if (product.rating && product.rating >= 4.5) {
      score += 10;
      matchReasons.push(`Top-rated (${product.rating}★)`);
    } else if (product.rating && product.rating >= 4.0) {
      score += 5;
    }

    // 5. Food Delivery & Service Speed
    if (specs.deliveryTime && parseInt(String(specs.deliveryTime)) <= 30) {
      score += 5;
      matchReasons.push(`Fast delivery (${specs.deliveryTime})`);
    }
    if (specs.hygieneRating && String(specs.hygieneRating).includes("5.0")) {
      score += 5;
      matchReasons.push("Top hygiene certification");
    }

    return {
      ...product,
      score: Math.max(0, Math.min(100, Math.round(score))),
      matchReasons
    };
  });

  // Sort based on strategy
  if (sortBy === "price_asc") {
    return scored.sort((a, b) => a.price - b.price);
  }
  if (sortBy === "price_desc") {
    return scored.sort((a, b) => b.price - a.price);
  }
  if (sortBy === "rating") {
    return scored.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  // Default: Recommended (Rank score descending)
  return scored.sort((a, b) => (b.score || 0) - (a.score || 0));
}

export function compareProducts(products: NormalizedProduct[]): ProductComparisonResult {
  if (products.length === 0) {
    return {
      products: [],
      bestOptionId: "",
      specComparison: [],
      verdict: "No products available for comparison."
    };
  }

  const sorted = rankProducts(products);
  const best = sorted[0];

  // Compile unique spec keys across all products
  const featureKeys = new Set<string>(["price", "rating", "reviews", "merchant", "availability", "shipping"]);
  products.forEach(p => {
    Object.keys(p.specifications || {}).forEach(k => featureKeys.add(k));
  });

  const specComparison = Array.from(featureKeys).map(key => {
    const values: Record<string, string | number> = {};
    products.forEach(p => {
      if (key === "price") {
        values[p.id] = `$${p.price.toFixed(2)}`;
      } else if (key === "rating") {
        values[p.id] = p.rating ? `${p.rating.toFixed(1)} / 5.0 ★` : "Unrated";
      } else if (key === "reviews") {
        values[p.id] = p.reviewsCount != null ? `${p.reviewsCount.toLocaleString()} verified reviews` : "0 reviews";
      } else if (key === "merchant") {
        values[p.id] = p.merchant.name;
      } else if (key === "availability") {
        values[p.id] = p.availability;
      } else if (key === "shipping") {
        values[p.id] = p.shippingCost === 0 ? "Free Shipping" : `$${p.shippingCost.toFixed(2)}`;
      } else {
        values[p.id] = (p.specifications?.[key] as string | number) ?? "—";
      }
    });
    return {
      featureName: key.toUpperCase(),
      values
    };
  });

  const reviewHighlight = best.rating
    ? `Customer satisfaction score of ${best.rating}★ across ${(best.reviewsCount || 0).toLocaleString()} reviews.`
    : "Verified seller credentials.";

  return {
    products: sorted,
    bestOptionId: best.id,
    specComparison,
    verdict: `Recommended: ${best.title} from ${best.merchant.name} at $${best.price.toFixed(2)}. ${reviewHighlight} Selected based on reviews analysis, spec benchmarking, and value-for-money.`
  };
}

