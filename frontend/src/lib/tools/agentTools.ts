import { discoverProducts, compareProducts } from "../services/productDiscoveryService";
import { evaluateBudget } from "../agents/budgetAgent";
import { evaluateSecurity } from "../agents/securityAgent";
import type { NormalizedProduct, ProductComparisonResult, SearchOptions } from "../types/product";

export const AgentTools = {
  async searchProducts(query: string, options?: SearchOptions): Promise<NormalizedProduct[]> {
    const res = await discoverProducts(query, options);
    return res.products;
  },

  compareProducts(products: NormalizedProduct[]): ProductComparisonResult {
    return compareProducts(products);
  },

  validateBudget(product: NormalizedProduct, spentToday: number, reserved: number) {
    return evaluateBudget(product, spentToday, reserved);
  },

  checkSecurity(prompt: string, product?: NormalizedProduct) {
    return evaluateSecurity(prompt, product);
  }
};

