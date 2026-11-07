import { describe, expect, it } from "vitest";
import { POLICY_BOUNDS, POLICY_DEFAULTS, requiresOverride, validateLimits } from "./policy";

describe("spending policy", () => {
  it("defaults to $35 per transaction and $100 per day", () => {
    expect(POLICY_DEFAULTS).toEqual({ singleTransactionLimit: 35, dailyLimit: 100 });
  });
  it("allows up to $2,500 per transaction and $10,000 per day", () => {
    expect(POLICY_BOUNDS.singleTransactionLimit.max).toBe(2500);
    expect(POLICY_BOUNDS.dailyLimit.max).toBe(10000);
    expect(validateLimits({ singleTransactionLimit: 2500, dailyLimit: 10000 })).toEqual([]);
    expect(validateLimits({ singleTransactionLimit: 2501, dailyLimit: 10000 })).toHaveLength(1);
  });
  it("requires override when total exceeds single limit or remaining balance", () => {
    const l = { singleTransactionLimit: 35, dailyLimit: 100 };
    expect(requiresOverride(30, l, 100)).toBe(false);
    expect(requiresOverride(36, l, 100)).toBe(true);
    expect(requiresOverride(30, l, 20)).toBe(true);
  });
});
