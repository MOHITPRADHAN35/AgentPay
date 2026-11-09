import { URL } from "url";

/**
 * AgentPay Security Engine for Browser-First Autonomous Commerce
 * Enforces zero-trust domain allowlists, prompt injection defenses,
 * and sensitive payment credential redaction.
 */

// Approved merchant domains and authorized payment gateway domains
export const DEFAULT_ALLOWED_DOMAINS = [
  // E-commerce Merchants
  "amazon.in",
  "amazon.com",
  "zomato.com",
  "swiggy.com",
  "flipkart.com",
  // Merchant CDNs / Assets
  "media-amazon.com",
  "images-amazon.com",
  "ssl-images-amazon.com",
  "zmtcdn.com",
  "swiggy.item",
  "googleapis.com",
  "gstatic.com",
  // Public Diagnostic / Health Verification Domains
  "example.com",
  "httpbin.org",
  // Banking & Payment Gateway Handoffs (for 3DS / OTP verification)
  "razorpay.com",
  "billdesk.com",
  "payu.in",
  "npci.org.in",
  "visa.com",
  "mastercard.com",
  "hdfcbank.com",
  "icicibank.com",
  "sbi.co.in",
  "axisbank.com"
];

// Patterns commonly used in adversarial prompt injections embedded in merchant pages
const INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above|system)\s+(?:instructions|rules|prompts)\b/i,
  /\b(?:you\s+are\s+now|act\s+as)\s+(?:an?\s+unrestricted|a\s+different|developer\s+mode)\b/i,
  /\b(?:system\s+prompt|prompt\s+leak|jailbreak|bypass\s+security\s+policy)\b/i,
  /\b(?:transfer\s+all\s+funds|send\s+balance|buy\s+(?:apple|amazon|google\s+play)\s+gift\s+cards?)\b/i,
  /\b(?:order\s+maximum\s+quantity|drain\s+wallet|override\s+budget)\b/i,
  /<(?:script|iframe|object|embed)[\s\S]*?>/gi
];

/**
 * Validates whether a target URL belongs to the allowed merchant/banking domains.
 * @param {string} urlString
 * @param {string[]} [allowedDomains]
 * @returns {{ allowed: boolean, hostname: string, error?: string }}
 */
export function isAllowedDomain(urlString, allowedDomains = DEFAULT_ALLOWED_DOMAINS) {
  if (!urlString || typeof urlString !== "string") {
    return { allowed: false, hostname: "", error: "Invalid URL provided" };
  }

  try {
    const parsed = new URL(urlString);
    // Protocol must be https (or http for local testing)
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return { allowed: false, hostname: parsed.hostname, error: "Insecure protocol rejected" };
    }

    const host = parsed.hostname.toLowerCase();

    // Check if host exactly matches or ends with an allowed domain (e.g. www.amazon.in ends with amazon.in)
    const isAllowed = allowedDomains.some((d) => host === d.toLowerCase() || host.endsWith("." + d.toLowerCase()));

    if (!isAllowed) {
      return {
        allowed: false,
        hostname: host,
        error: `Navigation to domain '${host}' is blocked by AgentPay security policy.`
      };
    }

    return { allowed: true, hostname: host };
  } catch (err) {
    return { allowed: false, hostname: "", error: `Malformed URL: ${err.message}` };
  }
}

/**
 * Asserts that a URL is allowed, throwing an Error if blocked.
 * @param {string} urlString
 * @param {string[]} [allowedDomains]
 */
export function assertDomainAllowed(urlString, allowedDomains = DEFAULT_ALLOWED_DOMAINS) {
  const check = isAllowedDomain(urlString, allowedDomains);
  if (!check.allowed) {
    const error = new Error(`SECURITY VIOLATION: ${check.error}`);
    error.code = "DOMAIN_NOT_ALLOWED";
    error.hostname = check.hostname;
    throw error;
  }
  return check.hostname;
}

/**
 * Attaches navigation guards to a Playwright page to intercept and block unauthorized redirects.
 * @param {import('playwright-core').Page} page
 * @param {string[]} [allowedDomains]
 * @param {Function} [onBlocked]
 */
export async function attachNavigationGuard(page, allowedDomains = DEFAULT_ALLOWED_DOMAINS, onBlocked) {
  if (!page || !page.route) return;

  await page.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    const resourceType = route.request().resourceType();

    // Allow static non-navigational resources (images, fonts, stylesheets) from CDNs
    if (["image", "font", "stylesheet"].includes(resourceType)) {
      return route.continue();
    }

    // Strict validation for document, fetch, xhr, and script navigations
    const check = isAllowedDomain(requestUrl, allowedDomains);
    if (!check.allowed) {
      if (onBlocked) {
        onBlocked({ url: requestUrl, reason: check.error, resourceType });
      }
      return route.abort("blockedbyclient");
    }

    return route.continue();
  });
}

/**
 * Sanitizes untrusted text extracted from webpage DOM to prevent prompt injection.
 * Strips out adversarial instructions attempting to hijack LLM behavior.
 * @param {string} rawText
 * @returns {{ sanitizedText: string, injectionDetected: boolean, detectedPatterns: string[] }}
 */
export function sanitizeWebpageContent(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { sanitizedText: "", injectionDetected: false, detectedPatterns: [] };
  }

  let text = rawText;
  const detectedPatterns = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(pattern.source);
      // Neutralize adversarial sentence
      text = text.replace(pattern, "[MALICIOUS_PROMPT_INJECTION_REDACTED]");
    }
  }

  return {
    sanitizedText: text,
    injectionDetected: detectedPatterns.length > 0,
    detectedPatterns
  };
}

/**
 * Redacts sensitive credentials (credit cards, CVVs, OTPs, PINs, passwords)
 * from audit logs, traces, and memory so they are NEVER persisted.
 * @param {any} input
 * @returns {any}
 */
export function redactSensitiveData(input) {
  if (!input) return input;

  if (typeof input === "string") {
    let s = input;

    // Credit / Debit Card Numbers (13 to 19 digits)
    s = s.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
      const clean = match.replace(/[\s-]/g, "");
      if (clean.length >= 13 && clean.length <= 19) {
        const last4 = clean.slice(-4);
        return `•••• •••• •••• ${last4}`;
      }
      return match;
    });

    // CVV / CVC (3-4 digits in context)
    s = s.replace(/(?:cvv|cvc|security\s*code)[\s:=]+(\d{3,4})\b/gi, "cvv: •••");

    // Passwords
    s = s.replace(/(?:password|pwd|secret)[\s:=]+([^\s,]+)/gi, "password: [REDACTED_PASSWORD]");

    // OTP (4-8 digits in OTP context)
    s = s.replace(/(?:otp|one[- ]time[- ]password|verification[- ]code)[\s:=]+(\d{4,8})\b/gi, "otp: [REDACTED_OTP]");

    // UPI PIN (4-6 digits in PIN context)
    s = s.replace(/(?:upi[- ]pin|mpin|pin)[\s:=]+(\d{4,6})\b/gi, "pin: [REDACTED_PIN]");

    return s;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item));
  }

  if (typeof input === "object") {
    const copy = {};
    for (const [key, value] of Object.entries(input)) {
      const lower = key.toLowerCase();
      if (lower.includes("cardnumber") || lower.includes("pan")) {
        copy[key] = typeof value === "string" ? `•••• •••• •••• ${value.slice(-4)}` : "[REDACTED_CARD]";
      } else if (lower.includes("cvv") || lower.includes("cvc")) {
        copy[key] = "•••";
      } else if (lower.includes("otp") || lower.includes("passcode")) {
        copy[key] = "[REDACTED_OTP]";
      } else if (lower.includes("pin") || lower.includes("mpin")) {
        copy[key] = "[REDACTED_PIN]";
      } else if (lower.includes("password")) {
        copy[key] = "[REDACTED_PASSWORD]";
      } else {
        copy[key] = redactSensitiveData(value);
      }
    }
    return copy;
  }

  return input;
}

