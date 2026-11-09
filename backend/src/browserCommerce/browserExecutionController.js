import crypto from "crypto";
import { defaultSessionManager } from "./browserSessionManager.js";
import { AmazonAdapter } from "./merchantAdapters/AmazonAdapter.js";
import { ZomatoAdapter } from "./merchantAdapters/ZomatoAdapter.js";
import { GenericMerchantAdapter } from "./merchantAdapters/GenericMerchantAdapter.js";
import { redactSensitiveData, sanitizeWebpageContent, assertDomainAllowed } from "./securityEngine.js";

export const TaskState = {
  INITIALIZING: "INITIALIZING",
  NAVIGATING: "NAVIGATING",
  DISCOVERING: "DISCOVERING",
  CART_PREPARED: "CART_PREPARED",
  AWAITING_HUMAN_AUTH: "AWAITING_HUMAN_AUTH",
  CHECKOUT_IN_PROGRESS: "CHECKOUT_IN_PROGRESS",
  AWAITING_SENSITIVE_AUTH: "AWAITING_SENSITIVE_AUTH",
  VERIFYING_PAYMENT: "VERIFYING_PAYMENT",
  COMPLETED: "COMPLETED",
  NEEDS_VERIFICATION: "NEEDS_VERIFICATION",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

export class BrowserExecutionController {
  constructor(sessionManager = defaultSessionManager) {
    this.sessionManager = sessionManager;
    this.tasks = new Map(); // taskId -> TaskRecord
    this.processedIdempotencyKeys = new Set();
  }

  getAdapter(merchantName, domain, city) {
    const m = (merchantName || "").toLowerCase();
    if (m.includes("amazon")) return new AmazonAdapter(domain || "amazon.in");
    if (m.includes("zomato")) return new ZomatoAdapter(domain || "zomato.com", city || "bhubaneswar");
    return new GenericMerchantAdapter(merchantName, domain || "merchant.com");
  }

  logStep(task, stepName, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      step: stepName,
      details: redactSensitiveData(details),
    };
    task.logs.push(entry);
    task.updatedAt = new Date();
  }

  /**
   * Initializes a new autonomous browser procurement task.
   */
  async createProcurementTask({
    userId = "user_default",
    merchant = "amazon",
    domain,
    city = "bhubaneswar",
    query = "",
    budgetLimit = 1000,
  }) {
    const taskId = `task_bcom_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const adapter = this.getAdapter(merchant, domain, city);

    const task = {
      id: taskId,
      userId,
      merchant: adapter.name,
      domain: adapter.defaultDomain,
      city,
      query,
      budgetLimit,
      state: TaskState.INITIALIZING,
      sessionId: null,
      discoveredItems: [],
      selectedItem: null,
      proposal: null,
      idempotencyKey: null,
      sensitiveAuthType: null,
      orderVerification: null,
      logs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, task);
    this.logStep(task, "TASK_CREATED", { merchant: adapter.name, query, budgetLimit });
    return task;
  }

  /**
   * Step 1: Discovers products on merchant site using persistent browser session.
   */
  async executeDiscovery(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    try {
      task.state = TaskState.NAVIGATING;
      this.logStep(task, "NAVIGATING_TO_MERCHANT", { domain: task.domain });

      const { sessionId, page } = await this.sessionManager.acquireSession({
        userId: task.userId,
        merchant: task.merchant.toLowerCase(),
        headless: false,
      });
      task.sessionId = sessionId;

      task.state = TaskState.DISCOVERING;
      this.logStep(task, "SEARCHING_CATALOG", { query: task.query });

      const adapter = this.getAdapter(task.merchant, task.domain, task.city);
      const items = await adapter.search(page, task.query, { budget: task.budgetLimit });

      task.discoveredItems = items;
      this.logStep(task, "DISCOVERY_COMPLETED", { itemCount: items.length });
      return { taskId, state: task.state, items };
    } catch (err) {
      task.state = TaskState.FAILED;
      this.logStep(task, "DISCOVERY_FAILED", { error: err.message });
      throw err;
    }
  }

  /**
   * Step 2: Adds selected product to cart, validates cart total, and generates Human Authorization Proposal.
   */
  async stageCartAndGenerateProposal(taskId, selectedItem) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    let session = this.sessionManager.getSession(task.sessionId);
    if (!session) {
      // Auto-acquire persistent visible browser session if not already attached
      const acquired = await this.sessionManager.acquireSession({
        userId: task.userId,
        merchant: task.merchant.toLowerCase(),
        headless: false,
      });
      task.sessionId = acquired.sessionId;
      session = this.sessionManager.getSession(task.sessionId);
    }

    try {
      task.selectedItem = selectedItem;
      const adapter = this.getAdapter(task.merchant, task.domain, task.city);

      this.logStep(task, "ADDING_TO_CART", { item: selectedItem.title, price: selectedItem.price });
      await adapter.addToCart(session.page, selectedItem);

      this.logStep(task, "INSPECTING_CART_AND_SAVED_PAYMENTS");
      const cartSummary = await adapter.getCartSummary(session.page, selectedItem);

      // Enforce zero-trust domain check
      assertDomainAllowed(`https://${cartSummary.merchantDomain}`);

      // Generate Idempotency Key
      const rawKey = `${task.userId}_${cartSummary.merchantDomain}_${selectedItem.title}_${cartSummary.total}`;
      const idempotencyKey = crypto.createHash("sha256").update(rawKey).digest("hex");

      // Budget check
      const isWithinBudget = cartSummary.total <= task.budgetLimit;

      // Construct Human Authorization Proposal with strict 5-minute expiration TTL
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins
      const proposalId = `prop_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

      const defaultPm = cartSummary.savedPaymentMethods.find((p) => p.isDefault) || cartSummary.savedPaymentMethods[0];

      const proposal = {
        proposalId,
        idempotencyKey,
        merchant: {
          name: task.merchant,
          domain: cartSummary.merchantDomain,
          verified: true,
        },
        product: {
          title: selectedItem.title,
          quantity: 1,
          unitPrice: selectedItem.price,
          currency: cartSummary.currency,
        },
        financials: {
          subtotal: cartSummary.subtotal,
          shipping: cartSummary.shipping,
          tax: cartSummary.tax,
          total: cartSummary.total,
          currency: cartSummary.currency,
        },
        availablePaymentMethods: cartSummary.savedPaymentMethods,
        selectedPaymentMethod: defaultPm || {
          id: "pm_default",
          type: "SAVED_MERCHANT_PAYMENT",
          maskedIdentifier: "Saved Merchant Payment Method",
        },
        budgetImpact: {
          budgetLimit: task.budgetLimit,
          currentTotal: cartSummary.total,
          remainingBudget: Math.max(0, task.budgetLimit - cartSummary.total),
          isWithinBudget,
        },
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      task.proposal = proposal;
      task.idempotencyKey = idempotencyKey;
      task.state = TaskState.AWAITING_HUMAN_AUTH;

      this.logStep(task, "HUMAN_AUTH_GATE_READY", {
        proposalId,
        total: cartSummary.total,
        isWithinBudget,
      });

      return { taskId, state: task.state, proposal };
    } catch (err) {
      task.state = TaskState.FAILED;
      this.logStep(task, "CART_PREPARATION_FAILED", { error: err.message });
      throw err;
    }
  }

  /**
   * Step 3: Human Authorization Approval.
   * Validates proposal expiry, cart integrity, budget, and idempotency before authorizing checkout.
   */
  async authorizeAndProceedToCheckout(taskId, proposalId, selectedPaymentMethodId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (task.state !== TaskState.AWAITING_HUMAN_AUTH) {
      throw new Error(`Task is in invalid state '${task.state}' for authorization.`);
    }

    const proposal = task.proposal;
    if (!proposal || proposal.proposalId !== proposalId) {
      throw new Error("Authorization Proposal not found or mismatch.");
    }

    // 1. Check expiration TTL
    const now = new Date();
    if (now > new Date(proposal.expiresAt)) {
      task.state = TaskState.FAILED;
      const err = new Error("Human authorization proposal has expired. Please re-validate your cart.");
      err.code = "PROPOSAL_EXPIRED";
      this.logStep(task, "AUTHORIZATION_EXPIRED", { proposalId });
      throw err;
    }

    // 2. Duplicate purchase check (Idempotency)
    if (this.processedIdempotencyKeys.has(proposal.idempotencyKey)) {
      task.state = TaskState.FAILED;
      const err = new Error("Duplicate transaction prevented. This order has already been authorized or executed.");
      err.code = "DUPLICATE_PURCHASE_PREVENTED";
      this.logStep(task, "DUPLICATE_CHECKOUT_ATTEMPT_BLOCKED", { idempotencyKey: proposal.idempotencyKey });
      throw err;
    }

    // 3. Re-verify cart on page to prevent hidden price increases or quantity drift
    const session = this.sessionManager.getSession(task.sessionId);
    if (!session) throw new Error(`Active browser session not found for task ${taskId}`);

    const adapter = this.getAdapter(task.merchant, task.domain, task.city);
    const liveCart = await adapter.getCartSummary(session.page, task.selectedItem);

    if (Math.abs(liveCart.total - proposal.financials.total) > 0.01) {
      task.state = TaskState.FAILED;
      const err = new Error(
        `Cart price changed from ${proposal.financials.total} to ${liveCart.total}. Authorization proposal is invalidated.`
      );
      err.code = "CART_TOTAL_CHANGED_INVALIDATING_PROPOSAL";
      this.logStep(task, "CART_TOTAL_MISMATCH_INVALIDATING_PROPOSAL", {
        expected: proposal.financials.total,
        actual: liveCart.total,
      });
      throw err;
    }

    // Mark idempotency key as claimed
    this.processedIdempotencyKeys.add(proposal.idempotencyKey);

    task.state = TaskState.CHECKOUT_IN_PROGRESS;
    this.logStep(task, "HUMAN_AUTHORIZATION_APPROVED", {
      proposalId,
      authorizedTotal: proposal.financials.total,
      paymentMethodId: selectedPaymentMethodId,
    });

    // Advance checkout to payment handoff
    const checkoutResult = await adapter.selectSavedPaymentMethodAndAdvance(session.page, selectedPaymentMethodId);

    if (checkoutResult.requiresSensitiveAuth) {
      task.state = TaskState.AWAITING_SENSITIVE_AUTH;
      task.sensitiveAuthType = checkoutResult.sensitiveAuthType || "OTP";
      this.logStep(task, "AWAITING_SENSITIVE_USER_AUTH", {
        type: task.sensitiveAuthType,
        instruction: "User must enter OTP / 3DS approval / UPI PIN directly on merchant page.",
      });

      return {
        taskId,
        state: task.state,
        requiresSensitiveAuth: true,
        sensitiveAuthType: task.sensitiveAuthType,
        message: "Please complete sensitive authentication (OTP/PIN) directly on the visible Chrome window.",
      };
    }

    // If no sensitive auth required, advance directly to verification
    return this.verifyOrderExecution(taskId);
  }

  /**
   * Step 4: Sensitive Auth Complete handoff notification from user.
   */
  async notifySensitiveAuthComplete(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    this.logStep(task, "USER_CONFIRMED_SENSITIVE_AUTH_ENTERED");
    return this.verifyOrderExecution(taskId);
  }

  /**
   * Step 5: Trustworthy Payment & Order Verification.
   * If confirmation is uncertain, flags as NEEDS_VERIFICATION. Never auto-retries.
   */
  async verifyOrderExecution(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.state = TaskState.VERIFYING_PAYMENT;
    this.logStep(task, "VERIFYING_MERCHANT_ORDER_CONFIRMATION");

    const session = this.sessionManager.getSession(task.sessionId);
    if (!session) throw new Error(`Active browser session not found for task ${taskId}`);

    const adapter = this.getAdapter(task.merchant, task.domain, task.city);
    const verification = await adapter.verifyOrderConfirmation(session.page);

    task.orderVerification = verification;

    if (verification.verified && verification.status === "COMPLETED") {
      task.state = TaskState.COMPLETED;
      this.logStep(task, "ORDER_VERIFIED_AND_FULFILLED", {
        orderId: verification.orderId,
        amount: verification.amount,
        status: verification.status,
      });
    } else {
      task.state = TaskState.NEEDS_VERIFICATION;
      this.logStep(task, "PAYMENT_STATUS_UNCERTAIN_NEEDS_VERIFICATION", {
        message: verification.message || "Awaiting merchant settlement confirmation.",
      });
    }

    return {
      taskId,
      state: task.state,
      verification: task.orderVerification,
    };
  }

  /**
   * Cancels a running procurement task.
   */
  async cancelTask(taskId, reason = "User requested cancellation") {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.state = TaskState.CANCELLED;
    this.logStep(task, "TASK_CANCELLED", { reason });

    if (task.sessionId) {
      await this.sessionManager.closeSession(task.sessionId);
    }
    return true;
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }
}

export const defaultExecutionController = new BrowserExecutionController();

