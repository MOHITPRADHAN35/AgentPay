import { sanitizeWebpageContent, redactSensitiveData } from "../securityEngine.js";

/**
 * Base abstract merchant adapter.
 * Defines standard lifecycle methods for browser-first autonomous procurement.
 */
export class BaseMerchantAdapter {
  constructor(name, defaultDomain) {
    this.name = name;
    this.defaultDomain = defaultDomain;
  }

  /**
   * Search merchant catalog for products.
   * @param {import('playwright-core').Page} page
   * @param {string} query
   * @param {Object} [options]
   * @returns {Promise<Array<{ id: string, title: string, price: number, currency: string, rating?: number, reviews?: number, url: string, image?: string }>>}
   */
  async search(page, query, options = {}) {
    throw new Error("search() must be implemented by merchant adapter");
  }

  /**
   * Add a selected product to the merchant cart.
   * @param {import('playwright-core').Page} page
   * @param {Object} productRef
   * @returns {Promise<{ success: boolean, cartCount?: number, message?: string }>}
   */
  async addToCart(page, productRef) {
    throw new Error("addToCart() must be implemented by merchant adapter");
  }

  /**
   * Inspect current cart before human authorization gate.
   * Extracts verified quantities, subtotal, shipping, tax, total, and detected saved payment methods.
   * @param {import('playwright-core').Page} page
   * @returns {Promise<{
   *   merchantDomain: string,
   *   items: Array<{ title: string, quantity: number, price: number }>,
   *   subtotal: number,
   *   shipping: number,
   *   tax: number,
   *   total: number,
   *   currency: string,
   *   savedPaymentMethods: Array<{ id: string, type: string, maskedIdentifier: string, isDefault: boolean }>
   * }>}
   */
  async getCartSummary(page) {
    throw new Error("getCartSummary() must be implemented by merchant adapter");
  }

  /**
   * Navigate to the final payment / authorization screen using the chosen saved payment method.
   * @param {import('playwright-core').Page} page
   * @param {string} savedPaymentMethodId
   * @returns {Promise<{ success: boolean, requiresSensitiveAuth: boolean, sensitiveAuthType?: 'OTP' | '3DS' | 'UPI_PIN' }>}
   */
  async selectSavedPaymentMethodAndAdvance(page, savedPaymentMethodId) {
    throw new Error("selectSavedPaymentMethodAndAdvance() must be implemented by merchant adapter");
  }

  /**
   * Verifies whether the merchant completed the order and extracts confirmation references.
   * @param {import('playwright-core').Page} page
   * @returns {Promise<{ verified: boolean, orderId?: string, amount?: number, currency?: string, status: string }>}
   */
  async verifyOrderConfirmation(page) {
    throw new Error("verifyOrderConfirmation() must be implemented by merchant adapter");
  }
}
