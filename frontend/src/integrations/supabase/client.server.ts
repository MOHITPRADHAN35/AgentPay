import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// In-Memory Fallback Store for Local / Hackathon Resilience
const localStore = {
  policy_decisions: new Map<string, any>(),
  transactions: [
    {
      id: "tx_seed_1",
      seq: 1,
      task_id: "task_seed_llama3",
      catalog_sku: "token-llama3-1m",
      description: "1M Llama-3 70B Tokens (Inference)",
      amount: 14.50,
      currency: "USD",
      paypal_order_id: "ORDER-SEED-9812",
      capture_id: "CAPTURE-SEED-9812",
      status: "COMPLETED",
      failure_reason: null,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      completed_at: new Date(Date.now() - 3600000 * 2 + 12000).toISOString(),
      hash: "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
      prev_hash: null,
      environment: "sandbox"
    }
  ]
};

function createMockSupabaseAdmin() {
  return {
    from: (table: string) => {
      let filterCol: string | null = null;
      let filterVal: any = null;
      let orderCol: string | null = null;
      let isAscending = true;
      let limitCount = 100;

      const chain: any = {
        select: (cols = "*") => chain,
        order: (col: string, { ascending }: { ascending: boolean }) => {
          orderCol = col;
          isAscending = ascending;
          return chain;
        },
        limit: (l: number) => {
          limitCount = l;
          return chain;
        },
        eq: (col: string, val: any) => {
          filterCol = col;
          filterVal = val;
          return chain;
        },
        gte: () => chain,
        lt: () => chain,
        is: () => chain,
        maybeSingle: async () => {
          if (table === "policy_decisions") {
            const item = filterCol === "task_id" ? localStore.policy_decisions.get(filterVal) : null;
            return { data: item || null, error: null };
          }
          if (table === "transactions") {
            const item = localStore.transactions.find((t: any) => t[filterCol!] === filterVal);
            return { data: item || null, error: null };
          }
          return { data: null, error: null };
        },
        then: (resolve: any) => {
          let rows = table === "transactions" ? [...localStore.transactions] : [];
          if (filterCol) {
            rows = rows.filter((r: any) => r[filterCol!] === filterVal);
          }
          if (orderCol) {
            rows.sort((a: any, b: any) => (isAscending ? (a[orderCol!] > b[orderCol!] ? 1 : -1) : (a[orderCol!] < b[orderCol!] ? 1 : -1)));
          }
          resolve({ data: rows.slice(0, limitCount), error: null });
        },
        insert: async (data: any) => {
          if (table === "policy_decisions") {
            localStore.policy_decisions.set(data.task_id, { ...data, created_at: new Date().toISOString() });
          }
          if (table === "transactions") {
            localStore.transactions.unshift({ ...data, created_at: data.created_at || new Date().toISOString() });
          }
          return { data, error: null };
        },
        update: (updates: any) => {
          const updateChain: any = {
            ...chain,
            eq: (col: string, val: any) => {
              if (table === "transactions") {
                if (col === "id" || col === "paypal_order_id" || col === "task_id") {
                  const target = localStore.transactions.find((t: any) => t[col] === val);
                  if (target) {
                    Object.assign(target, updates);
                  }
                }
              }
              return updateChain;
            },
            is: () => updateChain,
            lt: () => updateChain,
            gte: () => updateChain,
            then: (resolve: any) => resolve({ data: null, error: null })
          };
          return updateChain;
        }
      };
      return chain;
    },
    rpc: async (fn: string, args: any) => {
      if (fn === "reserve_transaction") {
        const newTx = {
          id: `tx_${Date.now()}`,
          seq: localStore.transactions.length + 1,
          task_id: args._task_id,
          catalog_sku: args._sku,
          description: args._description,
          amount: args._amount,
          currency: args._currency,
          paypal_order_id: null,
          capture_id: null,
          status: "PENDING",
          failure_reason: null,
          created_at: new Date().toISOString(),
          completed_at: null,
          hash: null,
          prev_hash: localStore.transactions[0]?.hash || null,
          environment: args._environment || "sandbox"
        };
        localStore.transactions.unshift(newTx);
        return { data: { id: newTx.id }, error: null };
      }
      return { data: null, error: null };
    }
  };
}

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return createMockSupabaseAdmin() as any;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: any | undefined;

export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
