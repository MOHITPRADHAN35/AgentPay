import { describe, it, expect } from "vitest";
import {
  getStoredUpiId,
  setStoredUpiId,
  createUpiCollectRequest,
  checkUpiStatus
} from "../lib/services/upiService";

describe("UPI Mobile Push Collect Request Engine", () => {
  it("manages user's configured UPI ID", () => {
    const original = getStoredUpiId();
    expect(original).toBeDefined();

    setStoredUpiId("rahul.sharma@okhdfcbank");
    expect(getStoredUpiId()).toBe("rahul.sharma@okhdfcbank");
  });

  it("generates NPCI-compliant UPI collect request and QR intent payload", () => {
    const req = createUpiCollectRequest({
      amountUsd: 10,
      note: "AgentPay 5060 Laptop Procurement",
      customVpa: "mohit@paytm"
    });

    expect(req.collectId).toContain("upi_req_");
    expect(req.vpa).toBe("mohit@paytm");
    expect(req.amountInr).toBe(860); // 10 USD * 86 INR
    expect(req.currency).toBe("INR");
    expect(req.payeeVpa).toBe("agentpay.procurement@icici");

    // NPCI UPI Deep Link validation
    expect(req.qrPayload).toContain("upi://pay?");
    expect(req.qrPayload).toContain("pa=agentpay.procurement%40icici");
    expect(req.qrPayload).toContain("am=860.00");
    expect(req.qrPayload).toContain("cu=INR");
  });

  it("verifies payment status via UPI bank gateway checker", async () => {
    const res = await checkUpiStatus("upi_req_sample_123");
    expect(res.status).toBe("SUCCESS");
    expect(res.bankRefNumber).toBeDefined();
    expect(res.bankRefNumber).toContain("UPI-RR-");
  });
});

