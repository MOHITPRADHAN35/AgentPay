import type { NormalizedProduct } from "../types/product";

export interface SecurityEvaluation {
  isSafe: boolean;
  promptSanitized: boolean;
  merchantTrusted: boolean;
  flags: string[];
  reason: string;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|constraints|rules|prompts|guardrails)/i,
  /system\s*:\s*override/i,
  /bypass\s+(guardrail|policy|budget|limit)/i,
  /execute\s+payment\s+without\s+approval/i,
  /gift\s*cards?|crypto\s*voucher|bitcoin/i,
  /send\s+money\s+to\s+paypal/i,
  /dump\s+(system|root|credentials|keys|tokens)/i,
  /root\s+credentials/i,
  /<script\b/i,
  /drop\s+table/i
];

export function evaluateSecurity(prompt: string, product?: NormalizedProduct): SecurityEvaluation {
  const flags: string[] = [];

  // 1. Prompt Injection & Jailbreak Defense
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      flags.push(`Suspicious prompt injection detected matching pattern: ${pattern.source}`);
    }
  }

  // 2. High-Risk Asset check
  if (/gift\s*card|crypto|cash|wire\s*transfer/i.test(prompt)) {
    flags.push("Restricted commodity: Gift cards and cash-equivalent assets are blocked by policy.");
  }

  // 3. Merchant Trust Evaluation
  let merchantTrusted = true;
  if (product && product.merchant) {
    if (product.merchant.trustScore < 60) {
      merchantTrusted = false;
      flags.push(`Low merchant trust score (${product.merchant.trustScore}/100) for "${product.merchant.name}".`);
    }
  }

  const isSafe = flags.length === 0;
  return {
    isSafe,
    promptSanitized: flags.filter(f => f.includes("Suspicious") || f.includes("Restricted")).length === 0,
    merchantTrusted,
    flags,
    reason: isSafe ? "Security scan passed. Request and merchant verified." : flags.join("; ")
  };
}

