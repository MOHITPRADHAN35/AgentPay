# AgentPay 2.0 — Flexible, API-Driven Frontend Refinement

Refine the newly redesigned AgentPay 2.0 frontend into a genuinely flexible, API-driven autonomous commerce platform.

## 1. Remove predefined procurement presets

**Do not build the application around predefined products, shopping categories, or hardcoded purchase scenarios.**

Remove fixed quick-purchase chips such as:
- Gaming laptop
- H100 GPU
- MacBook
- Groq tokens
- Domain registration

Users should be able to request absolutely anything supported by connected provider APIs using natural language.

Examples for testing only:
- Find a laptop with specific hardware requirements.
- Compare cloud GPU providers for model training.
- Find an affordable database hosting service.
- Purchase developer API credits.
- Find a product matching custom specifications.
- Compare services based on price and performance.

These are test cases, NOT permanent UI presets.

## 2. Build a universal procurement console

The primary interface should be an open-ended prompt:

"Describe anything you want your AI agents to research, compare, or procure..."

Allow users to specify:
- Product or service.
- Technical specifications.
- Budget.
- Preferred provider or merchant.
- Performance requirements.
- Other custom constraints.

AI should interpret the request and dynamically determine the appropriate discovery strategy.

## 3. Make discovery genuinely API-driven

Connect the frontend to the existing backend and provider integrations.

- Use Google Shopping / SerpApi for supported consumer products.
- Use connected developer-service APIs for cloud and software procurement.
- Use Zomato Model Context Protocol (MCP) Server for real-time restaurant discovery, menu browsing, and food ordering.
- Dynamically normalize different provider responses.
- Support different product types and specification structures.
- Display only real provider-sourced results.
- Clearly distinguish estimates from verified prices.

Do not assume every request is a physical product.

## 4. Dynamic multi-agent execution

The Orchestrator should determine which agents and tools are required for each request.

Agents should dynamically:
- Interpret user intent.
- Select relevant discovery providers.
- Search and retrieve results.
- Normalize specifications.
- Compare alternatives.
- Evaluate pricing.
- Enforce financial policies.
- Request human authorization.

Do not force every request through an identical hardcoded workflow.

## 5. Flexible product and service presentation

Build reusable, schema-driven result components.

Different results should display relevant attributes dynamically rather than forcing every item into laptop-style fields such as CPU, GPU, RAM, and SSD.

For example:
- Hardware: processor, GPU, memory, storage.
- Cloud compute: GPU model, VRAM, hourly rate, region.
- Software: pricing model, features, API limits.
- Hosting: storage, bandwidth, compute, pricing.

Unknown attributes should be omitted rather than fabricated.

## 6. Financial safety must remain consistent

Regardless of what users request:
- Enforce server-side budget limits.
- Validate merchant/provider information.
- Calculate applicable costs.
- Require explicit human authorization.
- Support legitimate, explicitly authorized overrides.
- Use PayPal for supported payment flows.
- Maintain transaction and audit records.

Never allow UI flexibility to weaken financial security.

## 7. TEST BEFORE COMPLETION

Run at least these functional test scenarios:

1. Consumer hardware discovery.
2. Cloud GPU discovery.
3. Developer API/service discovery.
4. An unfamiliar product or service category.
5. A request with strict technical specifications.
6. A request with a very low budget.
7. A request exceeding the configured transaction limit.
8. A request returning no provider results.
9. An invalid or unsupported request.
10. Two different procurement requests executed independently.
11. Food ordering & dining delivery via Zomato MCP Server.

Verify that:
- The system does not depend on hardcoded product catalogs.
- Provider selection is dynamic.
- Results are based on actual APIs.
- UI components adapt to different result schemas.
- Budget enforcement works for every category.
- Payment authorization remains mandatory.
- Empty, failed, and unsupported searches are handled correctly.

## 8. Preserve the existing design and integrations

Keep the premium dark fintech aesthetic, glassmorphism, responsive layouts, and smooth Motion scroll animations from the redesign.

Preserve the existing TanStack Start server functions, Supabase integration, PayPal checkout, transaction ledger, and cryptographic audit system.

Do not rebuild working backend functionality or replace real API integrations with mock data.

**Final objective: AgentPay should be a universal, API-driven autonomous procurement platform—not a predefined shopping application. Users describe what they need; agents dynamically discover, evaluate, and prepare the best available options for human authorization.**