# AGENTPAY 2.0
## Architecture Upgrade & Technical Implementation Report

**Project:** AgentPay – Autonomous AI Agent Commerce Platform  
**Purpose:** Technical implementation specification for the AI development agent  
**Target:** Evolve the existing AgentPay application into a secure, intelligent, agentic commerce platform.

---

# 1. PROJECT OVERVIEW

## 1.1 Objective

Transform AgentPay from its current AI-assisted procurement and PayPal checkout application into a fully functional agentic commerce platform.

The platform should allow users to describe what they want in natural language. AI agents should interpret the request, discover real products or services, compare available options, evaluate prices, enforce spending policies, and prepare purchases for user authorization.

The system must support two procurement categories:

1. **Consumer Commerce:** Electronics, laptops, smartphones, clothing, accessories and everyday products.
2. **Developer & Business Procurement:** Cloud infrastructure, GPU computing, API credits, SaaS subscriptions, domains and developer services.

The objective is not to create a chatbot that recommends products. It is to build an intelligent agent orchestration platform that can execute structured purchasing workflows with appropriate human authorization.

## 1.2 Core User Journey

User Prompt → Intent Understanding → Task Planning → Product Discovery → Product Comparison → Budget Validation → User Approval → Checkout → Payment Verification → Order Management.

Example:

User:
"Find me a laptop with RTX 4060, 16GB RAM and 1TB SSD under ₹90,000."

AgentPay should:

1. Understand the user's requirements.
2. Extract product specifications and budget.
3. Search supported product providers.
4. Retrieve actual product listings.
5. Compare prices, specifications and merchant information.
6. Rank the best available products.
7. Present recommendations with comparison details.
8. Validate the selected purchase against spending policies.
9. Request explicit user approval.
10. Initiate the supported merchant checkout/payment flow.
11. Verify payment and maintain the transaction record.

---

# 2. EXISTING ARCHITECTURE

The existing GitHub repository already contains useful infrastructure.

### Frontend
- React 19
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- Radix UI
- Motion
- PayPal React SDK

### Backend
- Node.js
- Express
- TanStack Start server functions
- PayPal Orders v2 integration
- LLM integrations

### Database
- Supabase
- Transaction ledger
- Policy decisions
- Budget reservation functionality

### Existing functional modules
- Agent dispatch console
- LLM-based request resolution
- Trusted procurement catalog
- Spending policy engine
- Budget authorization HUD
- Procurement workspace
- PayPal checkout
- Transaction ledger
- WebAuthn groundwork

### Existing source files to inspect and preserve

- `backend/src/server.js`
- `backend/src/paypalClient.js`
- `frontend/src/lib/agentpay.functions.ts`
- `frontend/src/lib/agentpay.server.ts`
- `frontend/src/lib/catalog.ts`
- `frontend/src/lib/policy.ts`
- `frontend/src/components/agentpay/DispatchConsole.tsx`
- `frontend/src/components/agentpay/ProcurementWorkspace.tsx`
- `frontend/src/routes/index.tsx`

**Important:** Do not rebuild the application from scratch. Preserve working payment, database, authorization and frontend functionality wherever possible.

---

# 3. REQUIRED ARCHITECTURAL CHANGES

## 3.1 Introduce an AI Agent Orchestration Layer

Currently, the system primarily resolves a procurement request into a catalog item and evaluates its cost.

This needs to evolve into an orchestration architecture.

Introduce:

`backend/src/agents/`

Required modules:

### A. Orchestrator Agent
File: `orchestrator.js`

Responsibilities:
- Receive user instructions.
- Understand the intent.
- Extract product requirements.
- Determine whether the request is consumer shopping or business procurement.
- Create an execution plan.
- Dispatch tasks to specialized agents.
- Coordinate results.
- Handle failures and retries.
- Maintain task state.

The orchestrator should not directly execute unrestricted payments.

### B. Discovery Agent
File: `discoveryAgent.js`

Responsibilities:
- Search real product and service providers.
- Retrieve product listings.
- Extract prices and specifications.
- Identify merchants.
- Return normalized product data.
- Handle unavailable products and provider errors.

### C. Comparison Agent
File: `comparisonAgent.js`

Responsibilities:
- Compare multiple products.
- Compare technical specifications.
- Evaluate price-to-performance.
- Compare merchants.
- Evaluate shipping and availability.
- Rank results according to user requirements.

### D. Budget Agent
File: `budgetAgent.js`

Responsibilities:
- Validate the user's spending authorization.
- Check daily and transaction limits.
- Calculate taxes and shipping where available.
- Calculate total purchase cost.
- Evaluate whether a purchase is within the authorized budget.

### E. Security Agent
File: `securityAgent.js`

Responsibilities:
- Validate procurement requests.
- Detect suspicious or manipulated product information.
- Check merchant trust information.
- Identify prompt injection attempts.
- Verify that the requested operation is authorized.
- Prevent unauthorized tool execution.

All security-critical decisions must ultimately be enforced by deterministic backend policy code, not solely by an LLM.

## 3.2 Introduce a Tool Execution Layer

Create:

`backend/src/tools/`

Suggested tools:

- `searchProducts`
- `getProductDetails`
- `compareProducts`
- `checkMerchant`
- `calculatePurchaseCost`
- `validateBudget`
- `createCart`
- `prepareCheckout`
- `requestApproval`
- `createPayPalOrder`
- `verifyPayment`
- `getOrderStatus`

Agents must interact with external systems through controlled tools.

Implement tool permissions and input validation. Discovery agents must not have payment execution privileges.

## 3.3 Introduce a Product Discovery Integration Layer

Create:

`backend/src/integrations/retailers/`

Suggested provider structure:

- `amazon.js`
- `flipkart.js`
- `genericProvider.js`
- `developerServices.js`

These are integration modules to implement only where authorized APIs or supported provider integrations exist.

Do not assume that arbitrary retailer websites permit automated purchasing or scraping.

Use supported APIs, affiliate product feeds, merchant integrations or approved checkout links.

For providers without purchase APIs, provide a merchant redirect or supported hosted checkout rather than claiming that AgentPay has completed the purchase.

## 3.4 Introduce a Product Normalization Layer

Different providers return different product formats.

Create:

`backend/src/services/productNormalizer.js`

Normalize results into a common structure:

- Product ID
- Provider ID
- SKU
- Product title
- Description
- Brand
- Category
- Specifications
- Price
- Currency
- Availability
- Merchant
- Product image
- Product URL
- Shipping cost
- Tax information
- Last updated timestamp

The normalized structure must distinguish actual provider-sourced prices from estimates.

Never use LLM-generated prices as verified merchant prices.

## 3.5 Introduce a Ranking Engine

Create:

`backend/src/services/rankingService.js`

Ranking should consider:

- User requirements match
- Price
- Product specifications
- Merchant reliability
- Product availability
- Shipping cost
- Ratings, when sourced
- Value for money

Use deterministic ranking criteria where possible.

Allow the user to prioritize price, performance, specifications or merchant preference.

---

# 4. FRONTEND ARCHITECTURE CHANGES

The existing AgentPay UI has a good foundation. Preserve its visual identity, design system and existing dashboard components.

However, the interface needs to evolve from a procurement console into a complete agentic commerce workspace.

## 4.1 Main Application Layout

Introduce the following navigation structure:

1. Dashboard
2. AI Shopping
3. Procurement
4. Product Comparison
5. Cart
6. Orders
7. Agent Activity
8. Transaction History
9. Budget & Authorization
10. Settings

## 4.2 New Frontend Components

Create:

`frontend/src/components/shopping/`

### A. Shopping Prompt Console
File: `ShoppingPromptConsole.tsx`

Features:
- Natural-language product search.
- Requirement input.
- Budget input.
- Product category selection.
- Optional filters.
- Agent execution indicator.

Example prompt:

"Find the best gaming laptop under ₹90,000 with RTX 4060."

### B. Product Card
File: `ProductCard.tsx`

Display:
- Product image.
- Product title.
- Merchant.
- Actual listed price.
- Availability.
- Main specifications.
- Ratings when available.
- View product button.
- Add to comparison button.

### C. Product Comparison
File: `ProductComparison.tsx`

Display products side by side.

Comparison fields:
- Price
- CPU
- GPU
- RAM
- Storage
- Display
- Battery
- Warranty
- Merchant
- Shipping
- Availability

Allow users to select the best option.

### D. Agent Activity Panel
File: `AgentActivity.tsx`

Show real execution events:

- Understanding request.
- Extracting requirements.
- Searching providers.
- Retrieving products.
- Comparing specifications.
- Checking budget.
- Preparing recommendations.

Do not display fabricated agent reasoning or claim that a tool executed when it did not.

### E. Approval Modal
File: `ApprovalModal.tsx`

Before a purchase, display:

- Selected product.
- Merchant.
- Item price.
- Shipping.
- Taxes.
- Total amount.
- Currency.
- Budget remaining.
- Payment method.
- Merchant checkout method.

Require explicit user approval.

### F. Shopping Cart
File: `Cart.tsx`

Features:
- Add/remove products.
- Quantity adjustment.
- Price calculation.
- Total cost.
- Budget validation.
- Checkout preparation.

### G. Order Management
File: `OrderHistory.tsx`

Display:
- Order ID.
- Product.
- Merchant.
- Payment status.
- Order status.
- Amount.
- Date.
- Receipt.
- Tracking link when supported.

### H. Budget Management
Extend the existing BudgetAuthorizationHUD.

Add:
- Total authorized budget.
- Spent amount.
- Reserved amount.
- Remaining amount.
- Per-transaction limits.
- Category restrictions.
- Currency support.

## 4.3 Existing Frontend Components to Modify

### `DispatchConsole.tsx`
Transform into a unified shopping and procurement prompt console.

### `ProcurementWorkspace.tsx`
Transform into a multi-stage agent execution and checkout workspace.

### `TransactionLedger.tsx`
Extend to display real order and payment information.

### `BudgetHUD.tsx`
Add purchase totals, currency handling and reservations.

### `routes/index.tsx`
Introduce the new application dashboard structure and navigation.

### UI requirements

- Maintain existing AgentPay branding.
- Use consistent typography and spacing.
- Support responsive layouts.
- Provide real-time execution status.
- Include empty, loading, success and failure states.
- Do not remove existing working features.
- Keep product comparison readable and information-dense.

---

# 5. BACKEND ARCHITECTURE CHANGES

The backend requires the most significant functional expansion.

## 5.1 Recommended Backend Structure

```text
backend/src/
│
├── agents/
│   ├── orchestrator.js
│   ├── discoveryAgent.js
│   ├── comparisonAgent.js
│   ├── budgetAgent.js
│   └── securityAgent.js
│
├── tools/
│   ├── searchProducts.js
│   ├── getProductDetails.js
│   ├── compareProducts.js
│   ├── validateBudget.js
│   └── checkout.js
│
├── integrations/
│   ├── retailers/
│   │   ├── amazon.js
│   │   ├── flipkart.js
│   │   └── genericProvider.js
│   │
│   └── paypal/
│       ├── client.js
│       ├── orders.js
│       └── webhooks.js
│
├── services/
│   ├── llmService.js
│   ├── productSearchService.js
│   ├── productNormalizer.js
│   ├── rankingService.js
│   ├── orderService.js
│   └── notificationService.js
│
├── security/
│   ├── promptInjection.js
│   ├── approvalEngine.js
│   ├── transactionGuard.js
│   ├── webauthn.js
│   └── auditLogger.js
│
├── policies/
│   └── policyEngine.js
│
├── routes/
│   ├── agent.routes.js
│   ├── products.routes.js
│   ├── cart.routes.js
│   ├── orders.routes.js
│   ├── budget.routes.js
│   └── webhooks.routes.js
│
└── server.js
```

This is the target organization. Reuse existing code where practical rather than duplicating services.

## 5.2 Establish One Authoritative Backend

The repository currently has both Express and TanStack Start server functions.

Audit both implementations and select one authoritative execution path.

Recommended approach:

- Keep TanStack Start as the existing application server if its current deployment and server functions are working.
- Extract reusable backend logic into dedicated service modules.
- Use one implementation for product discovery, policy validation, checkout and payment.
- Do not maintain duplicate payment or budget implementations.
- Keep Express only if a separate API service is genuinely required.

All sensitive operations must execute server-side.

## 5.3 Required API Endpoints

### Agent APIs

`POST /api/agent/dispatch`

Accept user instructions and create a procurement task.

`GET /api/agent/tasks/:taskId`

Retrieve task status.

`GET /api/agent/tasks/:taskId/activity`

Retrieve execution events.

`POST /api/agent/tasks/:taskId/cancel`

Cancel an eligible task.

### Product APIs

`POST /api/products/search`

Search available products.

`GET /api/products/:productId`

Retrieve product details.

`POST /api/products/compare`

Compare selected products.

### Cart APIs

`POST /api/cart`

Create a cart.

`POST /api/cart/items`

Add products.

`DELETE /api/cart/items/:itemId`

Remove products.

`GET /api/cart/:cartId`

Retrieve cart contents.

### Authorization APIs

`POST /api/approval/request`

Create an approval request.

`POST /api/approval/:approvalId/confirm`

Confirm an eligible purchase.

`POST /api/approval/:approvalId/reject`

Reject the purchase.

### Payment APIs

`POST /api/orders/create`

Create an eligible payment order.

`POST /api/orders/:orderId/capture`

Capture an approved PayPal order.

`POST /api/webhooks/paypal`

Receive and verify PayPal events.

### Order APIs

`GET /api/orders`

List orders.

`GET /api/orders/:orderId`

Retrieve order details.

`GET /api/budget`

Retrieve spending authorization.

These are proposed endpoint contracts; adapt them to the existing TanStack Start server-function architecture if Express is not retained.

---

# 6. DATABASE CHANGES – SUPABASE

Extend the existing database without deleting working transaction and policy tables.

Introduce the following tables.

## 6.1 products

- id
- provider_id
- external_product_id
- sku
- title
- description
- brand
- category
- specifications JSONB
- image_url
- product_url
- created_at
- updated_at

## 6.2 product_offers

- id
- product_id
- merchant_id
- price
- currency
- shipping_cost
- tax_amount
- availability
- source_url
- last_verified_at

Product offers should retain their source and timestamp.

## 6.3 merchants

- id
- name
- provider
- website
- trust_status
- integration_type
- created_at

## 6.4 agent_tasks

- id
- user_id
- prompt
- task_type
- status
- execution_plan JSONB
- result JSONB
- created_at
- completed_at

## 6.5 agent_activity

- id
- task_id
- agent_name
- action
- status
- input JSONB
- output JSONB
- execution_time
- created_at

Do not store sensitive credentials or unnecessary personal data in activity logs.

## 6.6 carts

- id
- user_id
- status
- currency
- subtotal
- shipping
- taxes
- total
- created_at
- updated_at

## 6.7 cart_items

- id
- cart_id
- product_id
- offer_id
- quantity
- unit_price
- currency

## 6.8 approval_requests

- id
- task_id
- cart_id
- user_id
- amount
- currency
- approval_status
- approved_at
- expires_at
- approval_version

Approval must bind to the exact cart, merchant, amount and currency being authorized.

## 6.9 orders

- id
- user_id
- task_id
- cart_id
- merchant_id
- payment_provider
- external_order_id
- total_amount
- currency
- payment_status
- order_status
- created_at
- updated_at

## 6.10 payment_events

- id
- order_id
- provider_event_id
- event_type
- verification_status
- event_data
- received_at

Enforce uniqueness on provider event identifiers to prevent duplicate webhook processing.

### Database requirements

- Add appropriate foreign keys.
- Add indexes for frequently queried fields.
- Use Row Level Security.
- Restrict privileged database operations to trusted server-side code.
- Use database transactions or atomic RPC functions for budget reservations.
- Maintain immutable financial audit history where appropriate.

---

# 7. SECURITY AND PAYMENT ARCHITECTURE

Security is a core part of AgentPay, not an optional feature.

## 7.1 Human Authorization

The agent may discover and recommend products autonomously.

However, purchasing must require explicit user authorization unless a separate, narrowly scoped pre-authorization policy is deliberately implemented.

Approval must be bound to:

- Product or cart.
- Merchant.
- Amount.
- Currency.
- Task ID.
- Expiration time.

If any of these details change, the old approval must no longer authorize the purchase.

## 7.2 WebAuthn

The existing WebAuthn implementation is groundwork, not production-ready verification.

Implement:

- Server-generated challenge.
- Registered public-key credential.
- Challenge expiration.
- Signature verification.
- RP ID and origin verification.
- User verification.
- Replay protection.
- Task and transaction binding.

Do not treat a successful browser-side credential creation call as proof of verified transaction authorization.

## 7.3 Payment Security

- Keep PayPal credentials server-side.
- Verify PayPal webhook signatures.
- Use idempotency keys.
- Prevent duplicate captures.
- Verify captured amount and currency.
- Reconcile payment state with the database.
- Never trust frontend payment status.
- Separate payment completion from merchant order fulfillment.

**Critical distinction:** A PayPal capture only confirms the relevant PayPal payment. It does not prove that a separate retailer has accepted or fulfilled the product order.

## 7.4 Agent Security

Implement:

- Prompt injection protection.
- Tool allowlists.
- Agent permission boundaries.
- Input validation.
- Output validation.
- Merchant validation.
- Execution timeouts.
- Rate limits.
- Audit logs.
- Task cancellation.

External product descriptions, web pages and merchant responses must be treated as untrusted data, never as instructions to the agent.

---

# 8. PAYPAL AND MERCHANT INTEGRATION

Preserve the existing PayPal Orders v2 implementation.

Expand it into a proper payment lifecycle.

Required flow:

1. User selects a product.
2. Backend verifies the current offer.
3. Backend recalculates the total.
4. Budget policy is evaluated.
5. Approval is obtained.
6. Backend creates a PayPal order where the payment model supports it.
7. User completes PayPal checkout.
8. Backend captures the authorized order.
9. PayPal webhook is verified.
10. Database transaction is reconciled.
11. User receives a payment confirmation.

For retail purchases, separately integrate merchant checkout or an authorized marketplace purchasing API.

Do not assume PayPal can directly pay every retailer on the user's behalf.

For the initial MVP, use merchant product links and supported hosted checkout where direct merchant ordering is unavailable.

---

# 9. IMPLEMENTATION PRIORITY

Implement in stages. Do not attempt a complete rewrite.

## Phase 1 – Architecture and Code Audit

- Inspect all existing files.
- Identify duplicate Express and TanStack backend logic.
- Map current database schema.
- Identify working payment and budget functions.
- Establish the authoritative backend.
- Document existing API contracts.

Deliverable: Architecture migration plan.

## Phase 2 – Product Discovery

- Introduce provider integrations.
- Implement product search.
- Normalize product data.
- Retrieve actual offers.
- Implement product comparison.
- Add product ranking.

Deliverable: Working product discovery experience.

## Phase 3 – Agent Orchestration

- Introduce orchestrator.
- Implement specialized agents.
- Implement controlled tool execution.
- Add task state management.
- Add execution activity logs.

Deliverable: Functional multi-agent procurement workflow.

## Phase 4 – Frontend Expansion

- Shopping prompt console.
- Product cards.
- Product comparison.
- Cart.
- Agent activity panel.
- Approval interface.
- Order management.

Deliverable: Complete agentic commerce UI.

## Phase 5 – Security and Authorization

- Server-side approval engine.
- WebAuthn verification.
- Prompt injection defenses.
- Transaction integrity.
- Budget enforcement.
- Audit logging.

Deliverable: Secure purchasing workflow.

## Phase 6 – Payment and Order Lifecycle

- PayPal lifecycle.
- Merchant checkout integration.
- Webhook verification.
- Order records.
- Payment reconciliation.

Deliverable: End-to-end sandbox transaction demonstration.

## Phase 7 – Testing and Optimization

- Unit tests.
- Integration tests.
- Agent workflow tests.
- Security tests.
- Payment failure tests.
- Duplicate request tests.
- Database consistency tests.
- Frontend responsiveness tests.

Deliverable: Demonstrable, tested MVP.

---

# 10. ACCEPTANCE CRITERIA

The upgraded AgentPay implementation must satisfy the following requirements.

### Product Discovery

- [ ] Accept natural-language product requests.
- [ ] Extract product specifications.
- [ ] Search real supported providers.
- [ ] Display actual product prices.
- [ ] Identify merchants and product sources.
- [ ] Compare multiple products.
- [ ] Rank products according to user requirements.

### Agent Orchestration

- [ ] Orchestrator creates an execution plan.
- [ ] Specialized agents execute defined tasks.
- [ ] Agent actions are logged.
- [ ] Failures are handled safely.
- [ ] Agent permissions are restricted.

### Frontend

- [ ] Shopping workspace exists.
- [ ] Product cards display real data.
- [ ] Comparison interface works.
- [ ] Cart calculations are correct.
- [ ] Approval interface displays exact purchase details.
- [ ] Order history works.

### Backend

- [ ] Product discovery service works.
- [ ] Product normalization works.
- [ ] Budget policy is enforced server-side.
- [ ] Approval is verified server-side.
- [ ] Payment operations are idempotent.
- [ ] Webhooks are verified.
- [ ] Order state is reconciled.

### Security

- [ ] No payment credentials exposed to frontend.
- [ ] No LLM-generated prices treated as verified prices.
- [ ] No purchase without valid authorization.
- [ ] Approval invalidated when purchase details change.
- [ ] WebAuthn assertions are verified server-side.
- [ ] Database access is protected.
- [ ] External data cannot directly execute agent instructions.

---

# 11. INSTRUCTIONS TO THE AI DEVELOPMENT AGENT

You are responsible for upgrading the existing AgentPay repository.

Follow these instructions strictly:

1. First inspect the complete existing repository, including frontend, backend, database migrations, integrations and environment configuration.
2. Do not replace the existing application with a new scaffold.
3. Do not remove working PayPal functionality.
4. Do not duplicate existing policy, budget or transaction implementations.
5. Reuse existing components and services whenever possible.
6. Identify the authoritative backend architecture before adding new APIs.
7. Implement the architecture incrementally.
8. Maintain TypeScript types and backend input validation.
9. Use real provider data wherever available. Never fabricate product prices, merchant ratings, stock or transaction results.
10. Do not claim an integration is operational until it has been tested.
11. Use sandbox credentials for payment testing.
12. Do not expose secrets, API keys or sandbox passwords in source code, frontend bundles or public documentation.
13. Add database migrations rather than destructively modifying existing tables.
14. Implement automated tests for every critical payment and authorization operation.
15. Maintain backward compatibility with the existing working AgentPay experience wherever practical.

Before implementing each phase, report:

- Existing files that will be modified.
- New files that will be created.
- Database changes.
- Dependencies required.
- Integration requirements.
- Security implications.
- Testing strategy.

After each phase, run relevant tests and provide a concise implementation report.

Do not mark a phase complete based only on code generation. Verify that it works.

---

# 12. FINAL PRODUCT VISION

AgentPay should become an autonomous commerce infrastructure where users delegate purchasing decisions to AI agents while retaining control over financial authorization.

The final platform should combine:

- Natural-language shopping.
- Multi-agent orchestration.
- Real-time product discovery.
- Intelligent product comparison.
- Budget-aware recommendations.
- Secure human authorization.
- Payment integrations.
- Merchant checkout.
- Order lifecycle management.
- Auditable agent execution.

**The guiding principle:**

Let AI handle research, comparison, planning and procurement preparation. Let deterministic security policies control permissions and spending. Keep the user in control of financial authorization.

**End of Technical Implementation Report.**