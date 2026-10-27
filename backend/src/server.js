import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPayPalOrder, capturePayPalOrder, getPayPalOrderDetails } from './paypalClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Database for Hackathon demo state
const state = {
  budget: {
    totalDailyCap: 100.00,
    spentToday: 0.00,
    maxPerTransaction: 35.00,
    allowedCategories: ['API Subscriptions', 'Compute & Cloud', 'Data Feeds', 'Domain & Hosting', 'Micro-Tools']
  },
  transactions: [
    {
      id: 'tx_seed_1',
      orderId: 'SAMPLE-ORDER-9921',
      description: 'Llama-3 70B API Tokens (1M)',
      amount: 14.50,
      currency: 'USD',
      status: 'COMPLETED',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      agentApproved: true,
      captureId: 'CAPTURE-SEED-9812'
    }
  ],
  tasks: [
    {
      id: 'task_default_1',
      title: 'Provision Cloud Vector Store',
      agent: 'InfraAgent-v4',
      cost: 18.00,
      status: 'PENDING_AUTHORIZATION',
      reasoning: 'Evaluated 3 providers; selected Qdrant sandbox plan for optimal latency within authorized budget limit ($35).'
    }
  ]
};

// 1. Health & Config Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AgentPay Payment & Agent Orchestrator Engine'
  });
});

app.get('/api/config', (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const isConfigured = Boolean(clientId && clientId !== 'your_sandbox_client_id_here');

  res.json({
    clientId: isConfigured ? clientId : 'sb',
    environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
    isConfigured,
    message: isConfigured 
      ? 'Live Sandbox credentials active' 
      : 'Using demo sandbox mode. Add PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET in backend/.env'
  });
});

// 2. Budget & Guardrail Endpoints
app.get('/api/budget', (req, res) => {
  res.json({
    budget: state.budget,
    remainingToday: Math.max(0, state.budget.totalDailyCap - state.budget.spentToday)
  });
});

app.put('/api/budget', (req, res) => {
  const { totalDailyCap, maxPerTransaction } = req.body;
  if (totalDailyCap !== undefined) state.budget.totalDailyCap = Number(totalDailyCap);
  if (maxPerTransaction !== undefined) state.budget.maxPerTransaction = Number(maxPerTransaction);
  res.json({ success: true, budget: state.budget });
});

// 3. Transactions / Audit Ledger
app.get('/api/transactions', (req, res) => {
  res.json({ transactions: state.transactions });
});

// 4. Create PayPal Order
app.post('/api/orders', async (req, res) => {
  try {
    const { amount, description = 'AgentPay Purchase', taskId } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }

    // Guardrail Check
    if (numAmount > state.budget.maxPerTransaction) {
      return res.status(403).json({
        error: `Guardrail violation: Requested $${numAmount.toFixed(2)} exceeds maximum per-transaction budget limit of $${state.budget.maxPerTransaction.toFixed(2)}.`
      });
    }

    if (state.budget.spentToday + numAmount > state.budget.totalDailyCap) {
      return res.status(403).json({
        error: `Guardrail violation: Requested $${numAmount.toFixed(2)} exceeds remaining daily budget limit of $${(state.budget.totalDailyCap - state.budget.spentToday).toFixed(2)}.`
      });
    }

    // Call PayPal Sandbox API
    const order = await createPayPalOrder({
      amount: numAmount,
      currency: 'USD',
      description,
      customId: taskId || `task_${Date.now()}`
    });

    res.json({
      orderId: order.id,
      status: order.status,
      links: order.links
    });
  } catch (err) {
    console.error('Create Order Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. Capture PayPal Order
app.post('/api/orders/:orderId/capture', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { taskId, description = 'Autonomous Agent Payment' } = req.body;

    const captureData = await capturePayPalOrder(orderId);

    // Extract captured amount from PayPal response
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const amountVal = parseFloat(capture?.amount?.value || '0.00');
    const captureId = capture?.id || `cap_${Date.now()}`;

    // Update state
    state.budget.spentToday += amountVal;

    const txRecord = {
      id: `tx_${Date.now()}`,
      orderId,
      captureId,
      description,
      amount: amountVal,
      currency: capture?.amount?.currency_code || 'USD',
      status: capture?.status || 'COMPLETED',
      timestamp: new Date().toISOString(),
      agentApproved: true
    };
    state.transactions.unshift(txRecord);

    // Update task status if taskId passed
    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) task.status = 'COMPLETED';
    }

    res.json({
      success: true,
      capture: captureData,
      transaction: txRecord
    });
  } catch (err) {
    console.error('Capture Order Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 6. Agent Dispatch & Task Orchestration
app.post('/api/agent/dispatch', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const lower = prompt.toLowerCase();
  let estimatedCost = 12.50;
  let title = 'Resource Procurement';
  let category = 'Compute & Cloud';
  let steps = [
    'Analyzed agent requirements from user request',
    'Filtered available marketplace vendor APIs',
    'Applied cryptographic spend limits against daily guardrail'
  ];

  if (lower.includes('h100') || lower.includes('450') || lower.includes('violation')) {
    title = '8x NVIDIA H100 Cluster Procurement';
    estimatedCost = 450.00;
    category = 'Compute & Cloud';
    steps.push('Attempted large-scale cluster allocation (EXCEEDS GUARDRAILS)');
  } else if (lower.includes('gpu') || lower.includes('model') || lower.includes('server')) {
    title = 'On-Demand GPU Instance (A10G 1hr)';
    estimatedCost = 9.80;
    category = 'Compute & Cloud';
    steps.push('Allocated dedicated node in us-east-1');
  } else if (lower.includes('api') || lower.includes('token') || lower.includes('llama')) {
    title = 'High-Throughput LLM Token Credits';
    estimatedCost = 15.00;
    category = 'API Subscriptions';
    steps.push('Generated proxy auth tokens with rate limit bounds');
  } else if (lower.includes('domain') || lower.includes('dns')) {
    title = 'Automated Project Domain Registration';
    estimatedCost = 11.99;
    category = 'Domain & Hosting';
    steps.push('Configured Cloudflare DNS records & SSL certificates');
  } else if (lower.includes('data') || lower.includes('scrape') || lower.includes('feed')) {
    title = 'Real-Time Financial Sentiment Feed';
    estimatedCost = 22.00;
    category = 'Data Feeds';
    steps.push('Stream connected to WebSocket firehose');
  }

  const taskId = `task_${Date.now()}`;
  const newTask = {
    id: taskId,
    title,
    category,
    cost: estimatedCost,
    status: 'READY_FOR_CHECKOUT',
    reasoning: estimatedCost > state.budget.maxPerTransaction
      ? `BLOCKED: Cost $${estimatedCost.toFixed(2)} exceeds max per-transaction policy limit of $${state.budget.maxPerTransaction.toFixed(2)}.`
      : `Selected optimal provider fulfilling prompt within guardrail budget ($${state.budget.maxPerTransaction.toFixed(2)} limit).`,
    steps
  };

  state.tasks.unshift(newTask);

  res.json({
    task: newTask,
    withinGuardrails: estimatedCost <= state.budget.maxPerTransaction
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AgentPay Backend Server running on http://localhost:${PORT}`);
  console.log(`   PayPal Mode: ${process.env.PAYPAL_ENVIRONMENT || 'sandbox'}`);
});
