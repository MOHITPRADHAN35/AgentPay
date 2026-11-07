import type { NormalizedProduct } from "../types/product";

export function extractSpecifications(title: string, snippet?: string): Record<string, string | number | boolean> {
  const text = `${title} ${snippet || ""}`.toLowerCase();
  const specs: Record<string, string | number | boolean> = {};

  // GPU detection (RTX 5090, 5080, 5070, 5060, 4090, 4080, 4070, 4060, Apple M-series, H100, A100)
  const gpuMatch = text.match(/(rtx\s*[45]0\d\d(?:\s*ti)?|geforce\s*(?:rtx\s*)?[45]0\d\d|\b5060\b|\b4060\b|rx\s*\d\d\d\d|m[1234](?:\s*pro|\s*max)?|h100|a100|l40s|t4)/i);
  if (gpuMatch) {
    let matched = gpuMatch[1].toUpperCase();
    if (matched === "5060" || matched === "4060") matched = `RTX ${matched}`;
    specs.gpu = matched;
  }

  // RAM detection
  const ramMatch = text.match(/(\d{1,3})\s*(?:gb|gigabytes?)\s*(?:ddr[45]|ram|unified\s*memory)?/i);
  if (ramMatch) specs.ram = `${ramMatch[1]} GB`;

  // Storage / SSD detection
  const ssdMatch = text.match(/(\d{1,2})\s*(?:tb|terabytes?)\s*(?:ssd|nvme)?|(\d{3,4})\s*(?:gb)\s*(?:ssd|nvme|storage)/i);
  if (ssdMatch) {
    specs.storage = ssdMatch[1] ? `${ssdMatch[1]} TB SSD` : `${ssdMatch[2]} GB SSD`;
  }

  // CPU / Processor detection
  const cpuMatch = text.match(/(intel\s*core\s*i[579]|core\s*i[579]|ryzen\s*[579]|apple\s*m[1234]|qualcomm\s*snapdragon\s*x)/i);
  if (cpuMatch) specs.cpu = cpuMatch[1].toUpperCase();

  // Screen size
  const screenMatch = text.match(/(\d{2}(?:\.\d)?)\s*(?:inch|"|-inch)/i);
  if (screenMatch) specs.display = `${screenMatch[1]}"`;

  return specs;
}

export function normalizeSerpShoppingItem(raw: any, query: string): NormalizedProduct {
  const price = typeof raw.extracted_price === "number" ? raw.extracted_price : parseFloat((raw.price || "0").replace(/[^0-9.]/g, "")) || 0;
  const merchantName = raw.source || "Online Merchant";
  const title = raw.title || query;
  const specs = extractSpecifications(title, raw.snippet);

  // Trust score heuristic based on known retailers
  const knownHighTrust = ["Amazon", "Best Buy", "Walmart", "B&H", "Apple", "Dell", "Lenovo", "Target", "eBay"];
  const isHighTrust = knownHighTrust.some(m => merchantName.toLowerCase().includes(m.toLowerCase()));
  const trustScore = isHighTrust ? 95 : 80;

  return {
    id: `serp_${raw.product_id || Math.random().toString(36).slice(2, 10)}`,
    providerId: "google_shopping",
    sku: `sku-${(raw.product_id || raw.title || "item").slice(0, 16).replace(/\W+/g, "-")}`,
    title,
    description: raw.snippet || `Purchasable item from ${merchantName}`,
    brand: raw.brand || title.split(" ")[0] || "Generic",
    category: "Consumer Commerce",
    specifications: specs,
    price,
    currency: "USD",
    availability: "IN_STOCK",
    merchant: {
      name: merchantName,
      trustScore,
      isVerified: isHighTrust
    },
    imageUrl: raw.thumbnail,
    productUrl: raw.link || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title)}`,
    shippingCost: raw.delivery?.includes("Free") ? 0 : 0,
    taxEstimated: Math.round(price * 0.07 * 100) / 100, // 7% standard est.
    totalEstimated: Math.round((price + (price * 0.07)) * 100) / 100,
    rating: raw.rating ? Number(raw.rating) : undefined,
    reviewsCount: raw.reviews ? Number(raw.reviews) : undefined,
    isLiveVerified: true
  };
}

