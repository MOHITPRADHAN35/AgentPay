# 🎬 AgentPay — 3-Minute Hackathon Presentation & Live Demo Script

**Project:** AgentPay — Autonomous AI Agent Commerce via PayPal  
**Hackathon Track:** PayPal Developer Hackathon (AI Commerce & Next-Gen Developer APIs)  
**Target Duration:** Exactly 3 Minutes (180 Seconds)  
**Live URL:** [http://localhost:8081/](http://localhost:8081/) | **Backend API:** [http://localhost:5000/](http://localhost:5000/)  

---

## ⏱️ Video / Stage Breakdown Timeline

```
0:00 ─── 0:30 │ Act 1: The Problem & The Solution (Hook)
0:30 ─── 1:00 │ Act 2: Architecture & Live Budget Guardrails
1:00 ─── 1:45 │ Act 3: Demo 1 — Rogue AI Blocked (Safety Proof)
1:45 ─── 2:30 │ Act 4: Demo 2 — Legitimate AI Procurement & Biometric PayPal Checkout
2:30 ─── 3:00 │ Act 5: Audit Ledger & Vision (Closing Pitch)
```

---

## 🎙️ Word-for-Word Presenter Script

### **Act 1: The Hook & The Critical Dilemma (0:00 – 0:30)**

* **On Screen:** Start at the top of the AgentPay dashboard (`http://localhost:8081/`). Camera or screen capture showing the sleek dark glassmorphism cockpit.
* **Presenter Voiceover:**
  > "Judges, autonomous AI agents are already writing code, managing servers, and orchestrating workflows. But there’s a critical missing link stopping them from acting in the real world: **How do we let an AI spend money without handing it an unbounded credit card?**
  >
  > A single hallucination or runaway loop could drain thousands of dollars in minutes. 
  >
  > Today, we built **AgentPay** — an enterprise-grade AI commerce protocol powered by **PayPal Orders v2, server-side budget guardrails, and hardware-backed biometric verification**."

---

### **Act 2: The HUD & Live PayPal Sandbox Connection (0:30 – 1:00)**

* **On Screen Action:** Hover over the top **Budget Authorization HUD** card. Then click **"Sandbox Setup"** in the top right to flash the connection modal, then close it.
* **Presenter Voiceover:**
  > "Here in our cockpit, notice the **Budget Authorization HUD**. The system enforces strict cryptographic spending bounds: a **$100.00 daily cap** and a **$35.00 single-transaction ceiling**.
  >
  > If we check our Sandbox Setup, you’ll see our backend is actively authenticated with PayPal’s Live Sandbox REST APIs using OAuth2 bearer tokens. No mock data — real PayPal endpoints are running live under the hood."

---

### **Act 3: Demo 1 — The Rogue Agent spends $450 (1:00 – 1:45)**

* **On Screen Action:**
  1. Scroll down to the **Agent Dispatch Console**.
  2. Click the preset: **`8x H100 GPU Cluster ($450.00) — Policy Violation Test`**.
  3. Click **"Dispatch instruction"**.
  4. Watch the agent evaluate and the checklist run.
  5. The red **`TRANSACTION BLOCKED`** alert flashes with the shield icon.
* **Presenter Voiceover:**
  > "Let’s test what happens when an AI goes rogue. 
  > 
  > Suppose an agent tries to autonomously spin up an 8x NVIDIA H100 GPU cluster costing **$450.00**. 
  > 
  > We dispatch the instruction. The AgentPay engine immediately resolves the request, checks the trusted catalog, and audits the transaction against our live guardrails.
  > 
  > **Boom: Transaction Blocked.** 
  > 
  > The engine catches that $450 exceeds our $35 limit. **Crucially, zero PayPal orders are created**, and checkout is disabled. The user’s capital remains completely safe."

---

### **Act 4: Demo 2 — Legitimate Procurement, Windows Hello Biometrics & PayPal Checkout (1:45 – 2:30)**

* **On Screen Action:**
  1. Click the preset: **`Cloud GPU Instance ($9.80)`**.
  2. Click **"Dispatch instruction"**.
  3. All 4 policy checks sequentially turn green: **`VERIFIED`**.
  4. Click **"Prepare checkout"** — shows PayPal Order ID creation.
  5. Show the **"Hardware Biometric Lock Active"** card.
  6. Click **"Bypass / Demo Sign"** (or click **"Verify with Face ID / PIN"** for Windows Hello).
  7. The badge turns green: **`Hardware Biometric Signature Verified — Unlocked`**.
  8. The native **PayPal Smart Payment Button** renders!
  9. Click **Pay with PayPal** -> In the sandbox login popup:
     - Press <kbd>F9</kbd> in email field (`sb-o4oe4753419327@personal.example.com`)
     - Press <kbd>F10</kbd> in password field (`9-"$7b(E`)
     - Click **Log In** & **Complete Purchase**!
* **Presenter Voiceover:**
  > "Now let's see legitimate autonomous commerce in action. 
  > 
  > Our agent needs one hour of on-demand cloud compute for **$9.80**. We dispatch the task. 
  > 
  > In real time, the policy engine verifies the category, ensures it's within the daily cap, and verifies the vendor. All checks return **VERIFIED**.
  > 
  > Next, we click **Prepare Checkout**. Our Node.js backend calls the **PayPal Orders v2 API** (`POST /v2/checkout/orders`), dynamically creating an authorized sandbox order with custom tracking metadata.
  > 
  > But notice: before any money moves, we have a **Hardware Biometric Security Gate**. Using WebAuthn and Windows Hello / Passkeys, the user must physically confirm presence.
  > 
  > Once biometrically signed, the native **PayPal Smart Payment Button** unlocks directly on the screen! With one click, funds are captured via PayPal’s server-side capture endpoint."

---

### **Act 5: The Immutable Audit Ledger & Closing Vision (2:30 – 3:00)**

* **On Screen Action:**
  1. Scroll down to the **Transaction Ledger**.
  2. Highlight the newly added transaction with its PayPal Order ID, capture timestamp, and status.
  3. Scroll back to top to show the updated daily budget remaining.
* **Presenter Voiceover:**
  > "Finally, look at our **Transaction Ledger**. Every single agent procurement is recorded in real time with its verified PayPal Order ID, timestamp, and cryptographic execution trace.
  >
  > By bridging LLM agent intelligence with **PayPal's global payment rails and biometric security**, AgentPay unlocks a multi-billion dollar economy where AI agents can buy compute, subscribe to APIs, and purchase services safely.
  >
  > Thank you! We’re excited to answer your questions."

---

## 🎯 Quick Cheat-Sheet for Presenter

| Timing | Key Talking Point | Visual Action on Screen |
|---|---|---|
| **0:00 - 0:30** | The Agent Finance Problem | Cockpit Hero view & liquid glass UI |
| **0:30 - 1:00** | Budget Guardrails & Sandbox Auth | Hover Budget HUD, show Sandbox Setup modal |
| **1:00 - 1:45** | Rogue Agent Blocked ($450 cluster) | Click H100 preset -> Dispatch -> Blocked Notice |
| **1:45 - 2:30** | Valid Purchase ($9.80) + Biometrics + PayPal Button | Click Cloud GPU preset -> Prepare checkout -> Biometric Unlock -> PayPal Button |
| **2:30 - 3:00** | Audit Ledger & Future of AI Commerce | Scroll to Transaction Ledger & Wrap-up |
