# AgentPay ⚡ — Autonomous AI Agent Commerce via PayPal

Built for the **PayPal Developer Hackathon**.

AgentPay empowers autonomous AI agents to research, negotiate, and execute micro-purchases (cloud compute, vector databases, domain registrations, API subscriptions) while strictly bounded by cryptographic budget guardrails and PayPal Orders v2 & Smart Button checkout.

---

## 🛠️ What is Required From Your Side (Checklist)

To process test transactions against PayPal's live sandbox:

1. **PayPal Sandbox App Credentials:**
   - Go to [PayPal Developer Applications (Sandbox)](https://developer.paypal.com/dashboard/applications/sandbox).
   - Click your sandbox app (or create one like `AgentPayHackathon`).
   - Copy:
     - `Client ID`
     - `Secret` (click *Show*)

2. **Add Credentials to `backend/.env`:**
   ```env
   PORT=5000
   PAYPAL_ENVIRONMENT=sandbox
   PAYPAL_CLIENT_ID=your_actual_client_id
   PAYPAL_CLIENT_SECRET=your_actual_client_secret
   ```

3. **Verify Connection:**
   ```bash
   npm run verify --prefix backend
   ```

4. **Sandbox Buyer Account (Active Demo Credentials):**
   - **Email:** `sb-o4oe4753419327@personal.example.com`
   - **Password:** `9-"$7b(E`
   - *AutoHotkey Shortcuts:*
     - Press <kbd>F9</kbd> inside the PayPal login email field to type the email.
     - Press <kbd>F10</kbd> inside the PayPal login password field to type the password.

---

## 🚀 Running the Project

### 1. Start the Backend API (Port 5000)
```bash
npm run dev:backend
```

### 2. Start the Frontend UI (Port 5173)
```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏗️ Architecture & PayPal APIs Used

- **PayPal Orders v2 API (`/v2/checkout/orders`):** Dynamic order creation with items, amounts, custom IDs, and application context.
- **PayPal Capture Order API (`/v2/checkout/orders/{id}/capture`):** Secure server-side capture upon buyer authorization.
- **`@paypal/react-paypal-js`:** Interactive Smart Payment Buttons embedded natively in the frontend.
- **Autonomous Guardrail Engine:** Enforces max transaction ceilings and daily caps before PayPal order creation.
