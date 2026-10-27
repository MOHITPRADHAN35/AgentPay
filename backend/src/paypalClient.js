import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_ENVIRONMENT = 'sandbox'
} = process.env;

const BASE_URL = PAYPAL_ENVIRONMENT === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Generate or return cached OAuth 2.0 Access Token from PayPal Sandbox
 */
export async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret || clientId === 'your_sandbox_client_id_here') {
    throw new Error('PayPal credentials missing or unconfigured. Please update your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env');
  }

  // Use cached token if valid for at least another 60 seconds
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  
  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth failed [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

/**
 * Create a PayPal Order v2
 */
export async function createPayPalOrder({ amount, currency = 'USD', description = 'AgentPay Order', customId = '' }) {
  const accessToken = await getAccessToken();

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        custom_id: customId || `agent_task_${Date.now()}`,
        description: description.substring(0, 127),
        amount: {
          currency_code: currency,
          value: Number(amount).toFixed(2)
        }
      }
    ],
    application_context: {
      brand_name: 'AgentPay Autonomous AI',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: 'http://localhost:5173/payment/success',
      cancel_url: 'http://localhost:5173/payment/cancel'
    }
  };

  const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to create PayPal order: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Capture payment for an approved PayPal Order v2
 */
export async function capturePayPalOrder(orderId) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to capture PayPal order [${orderId}]: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Retrieve details for a PayPal Order
 */
export async function getPayPalOrderDetails(orderId) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to retrieve order [${orderId}]: ${JSON.stringify(data)}`);
  }

  return data;
}
