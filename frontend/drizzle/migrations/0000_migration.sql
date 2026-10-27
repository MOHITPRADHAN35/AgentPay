create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  catalog_sku text not null,
  description text not null,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status text not null default 'PENDING' check (status in ('PENDING','COMPLETED','FAILED','CANCELLED')),
  environment text not null default 'sandbox',
  paypal_order_id text unique,
  capture_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  seq bigserial,
  prev_hash text,
  hash text
);
create table public.policy_decisions (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  prompt text not null,
  catalog_sku text,
  amount numeric(10,2),
  allowed boolean not null,
  rule text,
  reason text,
  environment text not null,
  created_at timestamptz not null default now()
);
grant select on public.transactions to anon, authenticated;
grant all on public.transactions to service_role;
grant all on public.policy_decisions to service_role;
grant usage, select on sequence public.transactions_seq_seq to service_role;
alter table public.transactions enable row level security;
alter table public.policy_decisions enable row level security;
create policy "ledger public read" on public.transactions for select to anon, authenticated using (true);