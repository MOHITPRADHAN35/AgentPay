import { describe, it, expect } from "vitest";
import { extractSpecifications, normalizeSerpShoppingItem } from "../lib/services/productNormalizer";
import { rankProducts, compareProducts } from "../lib/services/rankingService";
import { searchDevServices } from "../lib/integrations/retailers/developerServices";
import { detectCategory } from "../lib/services/productDiscoveryService";
import type { NormalizedProduct } from "../lib/types/product";

describe("Phase 2 - Product Discovery & Normalization Engine", () => {
  it("extracts hardware specifications from product text", () => {
    const title = "ASUS ROG Strix Gaming Laptop 16-inch Core i9 RTX 4070 32GB RAM 1TB SSD";
    const specs = extractSpecifications(title);

    expect(specs.gpu).toBe("RTX 4070");
    expect(specs.ram).toBe("32 GB");
    expect(specs.storage).toBe("1 TB SSD");
    expect(specs.cpu).toBe("CORE I9");
    expect(specs.display).toBe('16"');
  });

  it("normalizes raw shopping items into standard schema", () => {
    const raw = {
      product_id: "test_123",
      title: "Apple MacBook Pro M3 16GB 512GB SSD",
      extracted_price: 1599,
      source: "Best Buy",
      snippet: "Latest M3 chip laptop with 16GB RAM",
      thumbnail: "https://example.com/macbook.png",
      rating: 4.8,
      reviews: 420
    };

    const normalized = normalizeSerpShoppingItem(raw, "MacBook Pro");

    expect(normalized.id).toBe("serp_test_123");
    expect(normalized.price).toBe(1599);
    expect(normalized.merchant.name).toBe("Best Buy");
    expect(normalized.merchant.isVerified).toBe(true);
    expect(normalized.taxEstimated).toBeCloseTo(111.93, 1);
    expect(normalized.totalEstimated).toBeCloseTo(1710.93, 1);
  });

  it("ranks products deterministically based on budget and specs", () => {
    const mockProducts: NormalizedProduct[] = [
      {
        id: "p1",
        providerId: "test",
        sku: "sku-1",
        title: "Budget Laptop RTX 4050",
        description: "",
        brand: "Dell",
        category: "Consumer Commerce",
        specifications: { gpu: "RTX 4050", ram: "16 GB" },
        price: 750,
        currency: "USD",
        availability: "IN_STOCK",
        merchant: { name: "Amazon", trustScore: 95, isVerified: true },
        productUrl: "https://amazon.com",
        shippingCost: 0,
        taxEstimated: 52.5,
        totalEstimated: 802.5,
        rating: 4.2,
        isLiveVerified: true
      },
      {
        id: "p2",
        providerId: "test",
        sku: "sku-2",
        title: "Target Laptop RTX 4060",
        description: "",
        brand: "Lenovo",
        category: "Consumer Commerce",
        specifications: { gpu: "RTX 4060", ram: "16 GB" },
        price: 920,
        currency: "USD",
        availability: "IN_STOCK",
        merchant: { name: "Best Buy", trustScore: 95, isVerified: true },
        productUrl: "https://bestbuy.com",
        shippingCost: 0,
        taxEstimated: 64.4,
        totalEstimated: 984.4,
        rating: 4.8,
        isLiveVerified: true
      }
    ];

    const ranked = rankProducts(mockProducts, {
      targetBudget: 1000,
      requiredGpu: "RTX 4060"
    });

    // p2 matches required RTX 4060 and has higher rating
    expect(ranked[0].id).toBe("p2");
    expect(ranked[0].matchReasons).toContain("Exact GPU match (RTX 4060)");
  });

  it("generates side-by-side comparison matrix", () => {
    const mockProducts: NormalizedProduct[] = [
      {
        id: "a",
        providerId: "test",
        sku: "sku-a",
        title: "Product A",
        description: "",
        brand: "BrandA",
        category: "Consumer Commerce",
        specifications: { cpu: "Ryzen 7", ram: "16 GB" },
        price: 800,
        currency: "USD",
        availability: "IN_STOCK",
        merchant: { name: "Merchant A", trustScore: 90, isVerified: true },
        productUrl: "https://example.com/a",
        shippingCost: 0,
        taxEstimated: 56,
        totalEstimated: 856,
        isLiveVerified: true
      },
      {
        id: "b",
        providerId: "test",
        sku: "sku-b",
        title: "Product B",
        description: "",
        brand: "BrandB",
        category: "Consumer Commerce",
        specifications: { cpu: "Core i7", ram: "32 GB" },
        price: 950,
        currency: "USD",
        availability: "IN_STOCK",
        merchant: { name: "Merchant B", trustScore: 85, isVerified: false },
        productUrl: "https://example.com/b",
        shippingCost: 15,
        taxEstimated: 66.5,
        totalEstimated: 1031.5,
        isLiveVerified: true
      }
    ];

    const comparison = compareProducts(mockProducts);
    expect(comparison.products.length).toBe(2);
    expect(comparison.bestOptionId).toBeDefined();
    expect(comparison.specComparison.length).toBeGreaterThan(0);
    expect(comparison.verdict).toContain("Recommended");
  });

  it("benchmarks customer reviews, star ratings, and review volume", () => {
    const productsWithReviews: NormalizedProduct[] = [
      {
        id: "low_reviews",
        providerId: "test",
        sku: "sku-low",
        title: "Product Low Reviews",
        description: "",
        brand: "BrandX",
        category: "Consumer Commerce",
        specifications: {},
        price: 500,
        currency: "USD",
        availability: "IN_STOCK",
        merchant: { name: "Merchant X", trustScore: 80, isVerified: true },
        productUrl: "https://example.com/x",
        shippingCost: 0,
        taxEstimated: 35,
        totalEstimated: 535,
        rating: 3.8,
        reviewsCount: 12,
        isLiveVerified: true
      },
      {
        id: "high_reviews",
        providerId: "test",
        sku: "sku-high",
        title: "Product High Reviews",
        description: "",
        brand: "BrandY",
        category: "Consumer Commerce",
        specifications: {},
        price: 520,
        currency: "USD",
        availability: "IN_STOCK",
        merchant: { name: "Merchant Y", trustScore: 95, isVerified: true },
        productUrl: "https://example.com/y",
        shippingCost: 0,
        taxEstimated: 36.4,
        totalEstimated: 556.4,
        rating: 4.9,
        reviewsCount: 2450,
        isLiveVerified: true
      }
    ];

    const ranked = rankProducts(productsWithReviews);
    expect(ranked[0].id).toBe("high_reviews");
    expect(ranked[0].matchReasons).toContain("Top-rated (4.9★)");

    const comparison = compareProducts(productsWithReviews);
    const featureNames = comparison.specComparison.map(s => s.featureName);
    expect(featureNames).toContain("RATING");
    expect(featureNames).toContain("REVIEWS");
    expect(comparison.verdict).toContain("Customer satisfaction score of 4.9★ across 2,450 reviews");
  });

  it("correctly identifies developer category and catalog items", () => {
    expect(detectCategory("rent 1x H100 cloud GPU for 2 hours")).toContain("Cloud Compute");
    expect(detectCategory("gaming laptop 16gb")).toContain("Hardware");

    const devResults = searchDevServices("H100");
    expect(devResults.length).toBeGreaterThan(0);
    expect(devResults[0].brand).toBe("RunPod");
  });
});

