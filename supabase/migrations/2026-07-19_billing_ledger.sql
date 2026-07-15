-- Support for the unified client billing ledger (/billing/ledger).
--
-- Until now the utility float only ever stored a running balance plus the
-- most recent top-up -- there was no history of every top-up/draw event, so
-- there was no way to list "what happened to this client's money, and when."
-- This adds that history table and wires the existing top-up/draw actions to
-- write to it (see billing/actions.ts).
create table if not exists float_transactions (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  type text not null check (type in ('topup', 'draw')),
  amount numeric(10, 2) not null,
  bill_id uuid references bills(id) on delete set null,
  staff_id uuid references staff(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_float_transactions_property on float_transactions(property_id);

alter table float_transactions enable row level security;

create policy "staff full access on float_transactions"
  on float_transactions for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

-- Renewals and arrival requests already record a completed_at timestamp;
-- maintenance requests never got one, which means a completed maintenance
-- job's coordination fee has no reliable date to show in the ledger. Backfill
-- existing completed rows to created_at so old fees still get a sane date.
alter table maintenance_requests add column if not exists completed_at timestamptz;
update maintenance_requests set completed_at = created_at where status = 'completed' and completed_at is null;
