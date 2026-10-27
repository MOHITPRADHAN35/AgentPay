# AgentPay — Autonomous AI Agent Commerce via PayPal

A premium procurement terminal: user gives an instruction, the agent picks an item from a trusted catalog, the server checks it against spending rules, and a PayPal Sandbox order is created only when the rules pass. The user approves payment in PayPal, then the server captures it and records it in a ledger.

## What gets built

**Header** — custom bracket-style SVG mark, AgentPay wordmark, subtitle, environment badge (Demo Sandbox Mode / Sandbox Connected / Configuration Required / Connection Error), plus Sandbox Setup, Docs and GitHub links.

**Budget HUD** — daily cap $100, spent today (only completed captures), reserved (pending orders), remaining = max(0, cap − spent − reserved), single limit $35. Shown as a segmented bar with threshold marks and a near-limit warning.

**Cockpit (two columns)**
- Left, Dispatch Console: terminal-style input, character count, 5 preset scenarios (GPU $9.80, LLM credits $15, Domain & SSL $11.99, Market Data $22, Violation 8x H100 $450). "Delegate to Agent" button reads "Agent Deliberating..." and is disabled while a request runs.
- Right, Workspace: an empty state with an inactive frame. When a task is running it shows the **AgentAuthorizationSequence**: four corner brackets, a scan line, a glyph that resolves into a stable shape, and a policy checklist (Pending / Verifying / Verified / Blocked) driven by the real server response. Then come the item, cost, budget impact, the 01–06 execution timeline, PayPal Smart Buttons, and the receipt with a restrained particle burst.
- Blocked state: orange, shows the broken rule and amounts, no checkout.

**Ledger** — timestamp, description, order ID, capture ID, amount, status (Pending/Completed/Failed/Cancelled), a details drawer, copy buttons and a Sandbox label. Each record carries a SHA-256 hash chain that the server can verify. It is described as "tamper-evident audit chain", never "immutable".

**Sandbox Setup modal** — liquid-glass surface (SVG displacement filter, with a solid fallback). It has 5 steps, a credentials example, a copyable verify command (labelled as an in-app check: the "Verify connection" button calls the server and shows the real result), and live status.

**Demo mode** (no credentials): reasoning and policy checks still run on the server, and the result is clearly marked SIMULATED. No PayPal buttons and no fake capture IDs appear.

## Design
- Palette tokens: white #F9F9F9, blue #004E72, orange #FF6E42, navy #092634, converted to oklch in styles.css, with derived neutrals. Dark navy terminal surfaces. Orange is used only for attention and blocked states.
- Fonts: Manrope (headings), Geist (UI), JetBrains Mono (amounts, IDs, hashes), with tabular numerals.
- Motion uses the `motion` library (the base of Motion Primitives), with a few hand-ported primitives: spotlight, text-effect stagger, magnetic hover. Everything respects reduced motion.
- No purple gradients, robots or glow spam.

## Technical details
- Enable **Lovable Cloud**. Tables: `transactions` (id, task_id, catalog_sku, amount, currency, status, paypal_order_id, capture_id, created_at, completed_at, prev_hash, hash), `policy_decisions` (audit). Writes happen only through server functions using the admin client, and RLS allows public read of the ledger.
- Server functions (createServerFn) replace the spec's REST endpoints: `getConfig`, `getBudget`, `listTransactions`, `dispatchAgent`, `createOrder`, `captureOrder`, `cancelOrder`, `verifyChain`, `verifyConnection`.
- Agent parsing: Lovable AI (gemini-flash) uses tool-calling to map the prompt to a catalog SKU. If that fails, keyword matching takes over. The price always comes from the server catalog.
- Policy engine in a pure module `src/lib/policy.ts`, with vitest tests for: $450 blocked by the single limit, $9.80 allowed, daily-budget exhaustion blocked, and reservations counted.
- PayPal: OAuth via REST from the server (fetch, Worker-safe). Order creation reserves budget as PENDING, and a stale pending order expires after 30 minutes. Capture is idempotent (PayPal-Request-Id, status check), and the server verifies the amount and COMPLETED status before marking it completed. The frontend uses `@paypal/react-paypal-js` with the client ID from `getConfig`.
- Secrets PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_ENV are requested after the build. The app runs in Demo mode until they are added.
- Single page at `/` with its own head metadata.
