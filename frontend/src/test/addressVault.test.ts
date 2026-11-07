import { describe, it, expect } from "vitest";
import {
  getUserAddresses,
  saveUserAddress,
  resolveAddressFromPrompt,
  getDefaultAddress,
  INITIAL_ADDRESSES
} from "../lib/services/addressService";
import { executeOrchestrationPlan } from "../lib/agents/orchestrator";

describe("Jarvis Address Vault & Delivery Destination Engine", () => {
  it("initializes with verified default addresses for Home and Office", () => {
    const addresses = getUserAddresses();
    expect(addresses.length).toBeGreaterThanOrEqual(2);
    expect(addresses.some(a => a.alias === "Home")).toBe(true);
    expect(addresses.some(a => a.alias === "Office")).toBe(true);

    const defaultAddr = getDefaultAddress();
    expect(defaultAddr).toBeDefined();
    expect(defaultAddr.isDefault).toBe(true);
  });

  it("resolves explicit alias from natural language prompt ('office')", () => {
    const prompt = "Order 2 Margherita pizzas from Zomato to my office under ₹600";
    const res = resolveAddressFromPrompt(prompt);

    expect(res.matchedBy).toBe("explicit_alias");
    expect(res.address.alias.toLowerCase()).toContain("office");
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    expect(res.address.city).toBe("Gurugram");
  });

  it("resolves explicit alias from natural language prompt ('home')", () => {
    const prompt = "Buy an RTX 5060 laptop and deliver to my home under $1000";
    const res = resolveAddressFromPrompt(prompt);

    expect(res.matchedBy).toBe("explicit_alias");
    expect(res.address.alias.toLowerCase()).toContain("home");
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    expect(res.address.city).toBe("Bengaluru");
  });

  it("extracts inline city and pin code when user specifies custom address", () => {
    const prompt = "Send package to 123 MG Road, Bengaluru 560001";
    const res = resolveAddressFromPrompt(prompt);

    expect(res.matchedBy).toBe("inline_text");
    expect(res.address.city).toBe("BENGALURU");
    expect(res.address.postalCode).toBe("560001");
  });

  it("orchestrator integrates delivery address into execution task", async () => {
    const task = await executeOrchestrationPlan("Order Shahi Murgh Dum Biryani from Zomato to my office");

    expect(task.id).toBeDefined();
    expect(task.deliveryAddress).toBeDefined();
    expect(task.deliveryAddress?.alias.toLowerCase()).toContain("office");
    expect(task.activityLogs.some(l => l.action === "Resolve Destination")).toBe(true);
  });
});

