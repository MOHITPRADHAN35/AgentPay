/**
 * AgentPay Browser-First Autonomous Commerce Client SDK
 * Communicates with the backend Browser Execution Controller
 */

export type BrowserTaskState =
  | "INITIALIZING"
  | "NAVIGATING"
  | "DISCOVERING"
  | "CART_PREPARED"
  | "AWAITING_HUMAN_AUTH"
  | "CHECKOUT_IN_PROGRESS"
  | "AWAITING_SENSITIVE_AUTH"
  | "VERIFYING_PAYMENT"
  | "COMPLETED"
  | "NEEDS_VERIFICATION"
  | "FAILED"
  | "CANCELLED";

export interface MaskedPaymentMethod {
  id: string;
  type: string;
  maskedIdentifier: string;
  isDefault?: boolean;
}

export interface CartAuthorizationProposal {
  proposalId: string;
  idempotencyKey: string;
  merchant: {
    name: string;
    domain: string;
    verified: boolean;
  };
  product: {
    title: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  };
  financials: {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
  };
  availablePaymentMethods: MaskedPaymentMethod[];
  selectedPaymentMethod: MaskedPaymentMethod;
  budgetImpact: {
    budgetLimit: number;
    currentTotal: number;
    remainingBudget: number;
    isWithinBudget: boolean;
  };
  issuedAt: string;
  expiresAt: string;
}

export interface BrowserCommerceTask {
  id: string;
  userId: string;
  merchant: string;
  domain: string;
  city: string;
  query: string;
  budgetLimit: number;
  state: BrowserTaskState;
  discoveredItems: any[];
  selectedItem?: any;
  proposal?: CartAuthorizationProposal;
  idempotencyKey?: string;
  sensitiveAuthType?: "OTP" | "3DS" | "UPI_PIN";
  orderVerification?: {
    verified: boolean;
    orderId?: string;
    status: string;
    amount?: number;
    currency?: string;
    message?: string;
  };
  logs: Array<{ timestamp: string; step: string; details?: any }>;
}

const BACKEND_BASE = "http://localhost:5000";

export async function startBrowserProcurement(params: {
  userId?: string;
  merchant?: string;
  query: string;
  budgetLimit?: number;
  city?: string;
}): Promise<{ success: boolean; taskId: string; state: BrowserTaskState; task: BrowserCommerceTask }> {
  const res = await fetch(`${BACKEND_BASE}/api/browser/procure/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to start browser procurement (${res.status})`);
  }
  return res.json();
}

export async function prepareCartAndProposal(
  taskId: string,
  selectedItem: any
): Promise<{ success: boolean; taskId: string; state: BrowserTaskState; proposal: CartAuthorizationProposal }> {
  const res = await fetch(`${BACKEND_BASE}/api/browser/cart/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, selectedItem }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to stage cart and generate proposal (${res.status})`);
  }
  return res.json();
}

export async function authorizeCheckout(
  taskId: string,
  proposalId: string,
  selectedPaymentMethodId: string
): Promise<{
  success: boolean;
  taskId: string;
  state: BrowserTaskState;
  requiresSensitiveAuth?: boolean;
  sensitiveAuthType?: "OTP" | "3DS" | "UPI_PIN";
  verification?: any;
}> {
  const res = await fetch(`${BACKEND_BASE}/api/browser/checkout/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, proposalId, selectedPaymentMethodId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `Authorization failed (${res.status})`);
    (error as any).code = err.code;
    throw error;
  }
  return res.json();
}

export async function notifySensitiveAuthCompleted(taskId: string): Promise<{
  success: boolean;
  taskId: string;
  state: BrowserTaskState;
  verification: any;
}> {
  const res = await fetch(`${BACKEND_BASE}/api/browser/checkout/sensitive-handoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Sensitive auth handoff failed (${res.status})`);
  }
  return res.json();
}

export async function getBrowserTask(taskId: string): Promise<{ success: boolean; task: BrowserCommerceTask }> {
  const res = await fetch(`${BACKEND_BASE}/api/browser/task/${taskId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch browser task (${res.status})`);
  }
  return res.json();
}

export async function cancelBrowserTask(taskId: string, reason?: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BACKEND_BASE}/api/browser/task/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, reason }),
  });
  return res.json();
}

