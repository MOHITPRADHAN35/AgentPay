import { describe, it, expect } from "vitest";
import { parsePromptRequirements, executeOrchestrationPlan } from "../lib/agents/orchestrator";
import { searchZomatoFood, callZomatoMcpTool } from "../lib/integrations/mcp/zomatoMcp";
import { heuristicParseIntent } from "../lib/services/llmService";
import { getDefaultAddress, resolveAddressFromPrompt } from "../lib/services/addressService";
import { createUpiCollectRequest } from "../lib/services/upiService";

describe("Agent Mode Order Confirmation & Payment-Time Windows Hello", () => {
  it("strictly matches Chowmein prompt to authentic Chinese dishes and never pizza", async () => {
    const prompt = "order chowmein from zomato";
    const intent = heuristicParseIntent(prompt);
    expect(intent.category).toBe("Food & Dining Delivery");
    expect(intent.discoveryStrategy).toBe("ZOMATO_MCP");

    const results = await searchZomatoFood(intent.cleanQuery, { limit: 4 });
    expect(results.length).toBeGreaterThan(0);

    // Winner must be a Chowmein / Noodle dish, NOT Pizza
    const winner = results[0];
    expect(winner.title.toLowerCase()).toMatch(/(chowmein|noodle|chinese)/i);
    expect(winner.title.toLowerCase()).not.toContain("pizza");
  });

  it("correctly parses 'under 200 rupees' and returns dishes strictly within ₹200 budget", async () => {
    const prompt = "order chowmein under 200 rupees from zomato";
    const req = parsePromptRequirements(prompt);
    expect(req.targetBudget).toBeDefined();
    // 200 INR converted to USD: ~2.33 USD
    expect(req.targetBudget).toBeLessThanOrEqual(2.50);
    expect(req.targetBudget).toBeGreaterThanOrEqual(2.00);

    const results = await searchZomatoFood("chowmein", { maxBudget: req.targetBudget, limit: 4 });
    expect(results.length).toBeGreaterThan(0);

    const winner = results[0];
    expect(winner.title.toLowerCase()).toMatch(/(chowmein|noodle)/i);
    // Price in INR must be under 200 rupees
    const priceInr = Math.round(winner.price * 86);
    expect(priceInr).toBeLessThanOrEqual(200);
  });

  it("resolves delivery destination to Hostel when user specifies hostel or has hostel saved", async () => {
    const resolution = resolveAddressFromPrompt("order chowmein to hostel");
    expect(resolution.address.alias).toBe("Hostel");
    expect(resolution.address.street.toLowerCase()).toContain("hostel");

    const task = await executeOrchestrationPlan("Order chowmein to my hostel under 200 rupees");
    expect(task.deliveryAddress).toBeDefined();
    expect(task.deliveryAddress?.alias).toBe("Hostel");
  });

  it("strictly routes 'try ordering noodles using zomato under 300' to Zomato MCP and NEVER Amazon", async () => {
    const prompt = "try ordering noodles using zomato under 300";
    const req = parsePromptRequirements(prompt);
    expect(req.category).toBe("Food & Dining Delivery");
    expect(req.cleanQuery.toLowerCase()).toContain("noodle");
    // 300 INR converted to USD: ~3.49 USD
    expect(req.targetBudget).toBeDefined();
    expect(req.targetBudget).toBeLessThanOrEqual(3.60);
    expect(req.targetBudget).toBeGreaterThanOrEqual(3.00);

    const task = await executeOrchestrationPlan(prompt);
    expect(task.status).toBe("READY_FOR_APPROVAL");
    expect(task.recommendedProduct).toBeDefined();
    const best = task.recommendedProduct!;

    // Must be from Zomato / restaurant, strictly NOT Amazon
    expect(best.merchant.name.toLowerCase()).not.toContain("amazon");
    expect(best.merchant.name.toLowerCase()).toMatch(/(zomato|china|berco)/i);
    expect(best.title.toLowerCase()).toMatch(/(noodle|chowmein)/i);

    // Price must be within 300 rupees
    const inrPrice = Math.round(best.price * 86);
    expect(inrPrice).toBeLessThanOrEqual(300);
  });

  it("places Zomato MCP order with real tracking, courier assignment, and Hostel address", async () => {
    const hostelAddress = {
      id: "addr_hostel_campus",
      alias: "Hostel",
      name: "Mohit Kumar",
      phone: "+91 98765 43210",
      street: "Room 304, Block B Boys Hostel, Tech Campus",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
      country: "India",
      isDefault: false
    };

    const orderRes = await callZomatoMcpTool("place_order", {
      restaurantName: "Wow! China",
      product: { title: "Street Style Desi Veg Chowmein" },
      totalInr: 129,
      deliveryAddress: hostelAddress
    });

    expect(orderRes).toBeDefined();
    expect(orderRes.orderId).toMatch(/^ZOMATO-ORD-/);
    expect(orderRes.status).toBe("CONFIRMED_PREPARING");
    expect(orderRes.deliveryAddress.alias).toBe("Hostel");
    expect(orderRes.deliveryExecutive.name).toBe("Ramesh Kumar");
    expect(orderRes.estimatedDeliveryMins).toBeGreaterThan(0);
  });

  it("incorporates custom category parameter into prompt requirements", () => {
    const enrichedPrompt = "Order dinner for team (Category: Food & Dining Delivery via Zomato MCP Server)";
    const req = parsePromptRequirements(enrichedPrompt);
    expect(req.category).toBe("Food & Dining Delivery");
  });

  it("generates correct UPI payment collect rail payload for payment-time release", () => {
    const upiReq = createUpiCollectRequest({
      amountUsd: 2.20,
      note: "AgentPay: Veg Chowmein",
      customVpa: "mohit@okhdfcbank",
      customPayeeVpa: "mohit@okhdfcbank"
    });

    expect(upiReq.vpa).toBe("mohit@okhdfcbank");
    expect(upiReq.payeeVpa).toBe("mohit@okhdfcbank");
    expect(upiReq.amountInr).toBe(Math.round(2.20 * 86));
    expect(upiReq.qrPayload).toContain("upi://pay?");
    // Critical: must have literal '@' and NOT '%40' to prevent phone UPI apps showing 'temporary technical issue'
    expect(upiReq.qrPayload).toContain("pa=mohit@okhdfcbank");
    expect(upiReq.status).toBe("REQUEST_SENT");
  });
});
