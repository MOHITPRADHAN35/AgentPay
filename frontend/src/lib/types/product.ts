export type ItemType =
  | "HARDWARE"
  | "CLOUD_COMPUTE"
  | "DEVELOPER_SERVICE"
  | "HOSTING_DATABASE"
  | "SOFTWARE_SUBSCRIPTION"
  | "PHYSICAL_GOODS"
  | "FOOD_DINING"
  | "GENERAL";

export type PriceConfidence = "VERIFIED_MERCHANT" | "LIVE_MARKET_QUOTE" | "ESTIMATED_QUOTE";

export type PricingModel = "ONE_TIME" | "HOURLY" | "MONTHLY" | "USAGE_BASED";

export interface NormalizedProduct {
  id: string;
  providerId: string;
  sku: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  itemType?: ItemType;
  pricingModel?: PricingModel;
  priceConfidence?: PriceConfidence;
  specifications: Record<string, string | number | boolean>;
  price: number;
  currency: string;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "LIMITED" | "ON_DEMAND";
  merchant: {
    name: string;
    trustScore: number; // 0-100
    isVerified: boolean;
    domain?: string;
  };
  imageUrl?: string;
  productUrl: string;
  shippingCost: number;
  taxEstimated: number;
  totalEstimated: number;
  rating?: number;
  reviewsCount?: number;
  isLiveVerified: boolean;
  score?: number; // Ranking score
  matchReasons?: string[];
}

export interface ProductComparisonResult {
  products: NormalizedProduct[];
  bestOptionId: string;
  specComparison: {
    featureName: string;
    values: Record<string, string | number>;
  }[];
  verdict: string;
}

export interface SearchOptions {
  category?: string;
  itemType?: ItemType;
  maxBudget?: number;
  currency?: string;
  preferredMerchant?: string;
  customRequirements?: string;
  sortBy?: "recommended" | "price_asc" | "price_desc" | "rating";
  limit?: number;
}
