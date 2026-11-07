import type { NormalizedProduct } from "../../types/product";

export const DEV_SERVICES_CATALOG: NormalizedProduct[] = [
  {
    id: "dev_runpod_h100",
    providerId: "runpod",
    sku: "gpu-runpod-h100-sxm",
    title: "NVIDIA H100 SXM5 80GB Cloud GPU Instance (1 Hour)",
    description: "On-demand high-throughput enterprise LLM training and fine-tuning pod with 80GB VRAM and NVLink.",
    brand: "RunPod",
    category: "Developer & Business Procurement",
    specifications: {
      gpu: "1x NVIDIA H100 SXM 80GB",
      vram: "80 GB HBM3",
      cpu: "16 vCPUs",
      ram: "125 GB System RAM",
      storage: "100 GB NVMe Cache",
      billing: "Hourly On-Demand"
    },
    price: 3.29,
    currency: "USD",
    availability: "IN_STOCK",
    merchant: {
      name: "RunPod Cloud",
      trustScore: 98,
      isVerified: true
    },
    imageUrl: "https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500&auto=format&fit=crop&q=60",
    productUrl: "https://www.runpod.io/console/gpu-cloud",
    shippingCost: 0,
    taxEstimated: 0.23,
    totalEstimated: 3.52,
    rating: 4.9,
    reviewsCount: 1420,
    isLiveVerified: true
  },
  {
    id: "dev_lambda_a100",
    providerId: "lambda_labs",
    sku: "gpu-lambda-a100-40gb",
    title: "Lambda Labs 1x A100 Tensor Core GPU (1 Hour)",
    description: "High-performance deep learning cloud instance tuned for PyTorch and Transformer models.",
    brand: "Lambda Labs",
    category: "Developer & Business Procurement",
    specifications: {
      gpu: "1x NVIDIA A100 40GB",
      vram: "40 GB",
      cpu: "30 vCPUs",
      ram: "200 GB RAM",
      storage: "512 GB SSD",
      billing: "Hourly On-Demand"
    },
    price: 1.10,
    currency: "USD",
    availability: "IN_STOCK",
    merchant: {
      name: "Lambda Labs Cloud",
      trustScore: 96,
      isVerified: true
    },
    imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=60",
    productUrl: "https://lambdalabs.com/service/gpu-cloud",
    shippingCost: 0,
    taxEstimated: 0.08,
    totalEstimated: 1.18,
    rating: 4.8,
    reviewsCount: 890,
    isLiveVerified: true
  },
  {
    id: "dev_groq_tokens_10m",
    providerId: "groq",
    sku: "api-groq-llama3-10m",
    title: "10M Tokens Llama 3.3 70B Fast LPUs Inference Credits",
    description: "Ultra-low latency real-time inference via Language Processing Units (LPU) architecture.",
    brand: "Groq",
    category: "Developer & Business Procurement",
    specifications: {
      model: "Meta Llama 3.3 70B Versatile",
      throughput: "300+ tokens/sec",
      volume: "10,000,000 tokens",
      contextWindow: "128k context"
    },
    price: 5.90,
    currency: "USD",
    availability: "IN_STOCK",
    merchant: {
      name: "Groq Cloud API",
      trustScore: 99,
      isVerified: true
    },
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
    productUrl: "https://groq.com",
    shippingCost: 0,
    taxEstimated: 0,
    totalEstimated: 5.90,
    rating: 5.0,
    reviewsCount: 650,
    isLiveVerified: true
  },
  {
    id: "dev_domain_ai",
    providerId: "namecheap",
    sku: "domain-agentpay-ai",
    title: ".AI Premium Domain Registration (1 Year)",
    description: "Official Anguilla ccTLD registration with free WhoisGuard privacy and DNS management.",
    brand: "Namecheap",
    category: "Developer & Business Procurement",
    specifications: {
      tld: ".ai",
      duration: "1 Year",
      privacy: "Free Lifetime WhoisGuard",
      dns: "Anycast DNS Included"
    },
    price: 69.98,
    currency: "USD",
    availability: "IN_STOCK",
    merchant: {
      name: "Namecheap Domains",
      trustScore: 97,
      isVerified: true
    },
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60",
    productUrl: "https://www.namecheap.com",
    shippingCost: 0,
    taxEstimated: 0,
    totalEstimated: 69.98,
    rating: 4.7,
    reviewsCount: 3100,
    isLiveVerified: true
  }
];

export function searchDevServices(query: string): NormalizedProduct[] {
  const q = query.toLowerCase().trim();
  const direct = DEV_SERVICES_CATALOG.filter(item => {
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      Object.values(item.specifications).some(v => String(v).toLowerCase().includes(q))
    );
  });
  if (direct.length > 0) return direct;

  // Filter significant query keywords
  const stopwords = /^(find|buy|get|search|for|under|below|me|a|an|the|with|of|in|to|on|and|is|or|register|provision)$/i;
  const rawWords = q.replace(/[^\w\.\-]/g, " ").split(/\s+/).filter(w => w.length > 1 && !stopwords.test(w));

  const scored = DEV_SERVICES_CATALOG.map(item => {
    const text = `${item.title} ${item.description} ${item.brand} ${item.sku} ${Object.values(item.specifications).join(" ")}`.toLowerCase();
    let matches = 0;
    for (const w of rawWords) {
      if (text.includes(w)) matches++;
    }
    return { item, matches };
  }).filter(r => r.matches > 0);

  if (scored.length === 0) return DEV_SERVICES_CATALOG;

  scored.sort((a, b) => b.matches - a.matches);
  const maxMatches = scored[0]!.matches;
  return scored.filter(s => s.matches >= Math.max(1, maxMatches)).map(s => s.item);
}

