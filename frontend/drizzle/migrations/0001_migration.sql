alter table public.transactions alter column created_at set default date_trunc('milliseconds', now());

create or replace function public.tx_canonical(_id uuid, _task text, _sku text, _amount numeric, _currency text, _created timestamptz, _prev text)
returns text language sql immutable set search_path = public as $$
  select concat_ws('|', _id::text, _task, _sku, to_char(_amount, 'FM999999990.00'), _currency,
    floor(extract(epoch from _created) * 1000)::bigint::text, coalesce(_prev, 'GENESIS'))
$$;

create or replace function public.reserve_transaction(
  _task_id text, _sku text, _description text, _amount numeric, _currency text,
  _daily_limit numeric, _single_limit numeric, _environment text)
returns public.transactions
language plpgsql security definer set search_path = public as $$
declare
  _spent numeric; _reserved numeric; _prev text; _row public.transactions;
  _id uuid := gen_random_uuid(); _now timestamptz := date_trunc('milliseconds', now());
begin
  perform pg_advisory_xact_lock(424242);
  update public.transactions set status = 'CANCELLED', failure_reason = 'Approval window expired'
    where status = 'PENDING' and capture_id is null and created_at < now() - interval '30 minutes';
  if _amount > _single_limit then raise exception 'POLICY_TRANSACTION_LIMIT'; end if;
  select coalesce(sum(amount),0) into _spent from public.transactions
    where status = 'COMPLETED' and completed_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  select coalesce(sum(amount),0) into _reserved from public.transactions where status = 'PENDING';
  if _spent + _reserved + _amount > _daily_limit then raise exception 'POLICY_DAILY_BUDGET'; end if;
  if exists (select 1 from public.transactions where task_id = _task_id) then raise exception 'TASK_ALREADY_RESERVED'; end if;
  select hash into _prev from public.transactions order by seq desc limit 1;
  insert into public.transactions (id, task_id, catalog_sku, description, amount, currency, status, environment, created_at, prev_hash, hash)
  values (_id, _task_id, _sku, _description, _amount, _currency, 'PENDING', _environment, _now, _prev,
    encode(sha256(convert_to(public.tx_canonical(_id, _task_id, _sku, _amount, _currency, _now, _prev), 'UTF8')), 'hex'))
  returning * into _row;
  return _row;
end $$;
revoke all on function public.reserve_transaction(text,text,text,numeric,text,numeric,numeric,text) from public, anon, authenticated;
grant execute on function public.reserve_transaction(text,text,text,numeric,text,numeric,numeric,text) to service_role;