import { describe, expect, it } from "vitest";
import { evaluatePolicy, remaining } from "@/lib/policy";

const base = {
  dailyLimit: 100,
  singleTransactionLimit: 35,
  spentToday: 0,
  reserved: 0,
  currency: "USD",
};

describe("spending policy", () => {
  it("blocks a $450 request on the $35 single-transaction limit", () => {
    const d = evaluatePolicy({ ...base, item: { sku: "h100-x8", price: 450, currency: "USD" } });
    expect(d.allowed).toBe(false);
    expect(d.rule).toBe("TRANSACTION_LIMIT");
  });

  it("allows a $9.80 request with a fresh budget", () => {
    const d = evaluatePolicy({ ...base, item: { sku: "gpu-1h", price: 9.8, currency: "USD" } });
    expect(d.allowed).toBe(true);
  });

  it("blocks when the daily budget is exhausted", () => {
    const d = evaluatePolicy({
      ...base,
      spentToday: 95,
      item: { sku: "gpu-1h", price: 9.8, currency: "USD" },
    });
    expect(d.rule).toBe("DAILY_BUDGET");
  });

  it("counts pending reservations against the daily budget", () => {
    const d = evaluatePolicy({
      ...base,
      spentToday: 60,
      reserved: 30,
      item: { sku: "llm", price: 15, currency: "USD" },
    });
    expect(d.rule).toBe("DAILY_BUDGET");
    expect(remaining(100, 60, 30)).toBe(10);
  });

  it("blocks requests not in the catalog", () => {
    expect(evaluatePolicy({ ...base, item: null }).rule).toBe("REQUEST_VALIDATION");
  });

  it("never reports negative remaining budget", () => {
    expect(remaining(100, 120)).toBe(0);
  });
});
