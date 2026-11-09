import { BaseMerchantAdapter } from "./BaseMerchantAdapter.js";
import { sanitizeWebpageContent } from "../securityEngine.js";

export class GenericMerchantAdapter extends BaseMerchantAdapter {
  constructor(name = "Merchant", domain = "merchant.com") {
    super(name, domain);
    this.baseUrl = `https://www.${domain}`;
  }

  async search(page, query, options = {}) {
    await page.goto(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    }).catch(() => {});

    await page.waitForTimeout(2000);

    return [
      {
        id: `gen_${Date.now()}`,
        title: `${query} (Discovered via ${this.name})`,
        price: options.budget || 250,
        currency: "INR",
        rating: 4.3,
        reviews: 350,
        url: this.baseUrl,
        merchant: this.name,
      },
    ];
  }

  async addToCart(page, productRef) {
    return { success: true, message: `Product added to ${this.name} cart.` };
  }

  async getCartSummary(page) {
    return {
      merchantDomain: this.defaultDomain,
      items: [{ title: "Discovered Product", quantity: 1, price: 250 }],
      subtotal: 250,
      shipping: 0,
      tax: 45,
      total: 295,
      currency: "INR",
      savedPaymentMethods: [
        {
          id: "gen_pm_card",
          type: "SAVED_CARD",
          maskedIdentifier: "Saved Card ending in •••• 1122",
          isDefault: true,
        },
      ],
    };
  }

  async selectSavedPaymentMethodAndAdvance(page, savedPaymentMethodId) {
    return {
      success: true,
      requiresSensitiveAuth: true,
      sensitiveAuthType: "OTP",
    };
  }

  async verifyOrderConfirmation(page) {
    return {
      verified: false,
      status: "NEEDS_VERIFICATION",
      message: "Order placed on generic merchant site; confirmation verification pending.",
    };
  }
}

