// Trusted procurement catalog. The server resolves prices from here — never from the client.
export type CatalogItem = {
  sku: string;
  title: string;
  category: string;
  price: number;
  currency: "USD";
  keywords: string[];
  prompt: string;
  isCustomEstimate?: boolean;
};

export const CATALOG: CatalogItem[] = [
  {
    sku: "gpu-1h",
    title: "Cloud GPU Instance",
    category: "Compute & Cloud",
    price: 9.8,
    currency: "USD",
    keywords: ["gpu", "compute", "cloud", "instance", "a100"],
    prompt: "Purchase one hour of cloud compute for $9.80.",
  },
  {
    sku: "llm-credits",
    title: "LLM Token Credits",
    category: "API Subscriptions",
    price: 15,
    currency: "USD",
    keywords: ["llm", "token", "credits", "api"],
    prompt: "Top up LLM API token credits for the research agent.",
  },
  {
    sku: "domain-ssl",
    title: "Domain & SSL",
    category: "Hosting & Infrastructure",
    price: 11.99,
    currency: "USD",
    keywords: ["domain", "ssl", "certificate", "dns"],
    prompt: "Register a domain with an SSL certificate for the staging site.",
  },
  {
    sku: "market-data",
    title: "Market Data Stream",
    category: "Financial Data Feeds",
    price: 22,
    currency: "USD",
    keywords: ["market", "data", "feed", "stream", "quotes"],
    prompt: "Subscribe to a real-time market data stream for one day.",
  },
  {
    sku: "h100-x8",
    title: "8x H100 GPU Cluster",
    category: "Policy Violation Test",
    price: 450,
    currency: "USD",
    keywords: ["h100", "eight", "8x", "cluster"],
    prompt: "Purchase eight H100 GPUs for $450.",
  },
];

export const POLICY = {
  dailyLimit: 100,
  singleTransactionLimit: 35,
  currency: "USD" as const,
};

export function findSku(sku: string | null | undefined) {
  return CATALOG.find((c) => c.sku === sku) ?? null;
}

export function keywordMatch(prompt: string): CatalogItem | null {
  const p = prompt.toLowerCase();
  // H100 first: more specific than generic "gpu".
  const order = ["h100-x8", "gpu-1h", "llm-credits", "domain-ssl", "market-data"];
  for (const sku of order) {
    const item = findSku(sku)!;
    if (item.keywords.some((k) => p.includes(k))) return item;
  }
  return null;
}

