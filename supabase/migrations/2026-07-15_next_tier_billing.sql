-- "Next" tier migration (from Backend & App Gap Analysis, July 2026)
-- Covers gaps #7 (recurring billing), #8 (maintenance coordination fee),
-- #9 (Arrival Concierge queue), #10 (Renewal Handling). Run once in the
-- Supabase SQL editor, then deploy the corresponding app code.

-- ---------------------------------------------------------------------------
-- Gap #8: Maintenance coordination fee tracking
-- ---------------------------------------------------------------------------
alter table maintenance_requests add column if not exists coordination_fee numeric(10, 2);
alter table maintenance_requests add column if not exists fee_invoiced boolean not null default false;

-- ---------------------------------------------------------------------------
-- Gap #9: Arrival Concierge fulfillment queue
-- ---------------------------------------------------------------------------
alter table arrival_requests add column if not exists status text not null default 'pending'
  check (status in ('pending', 'in_progress', 'completed'));
alter table arrival_requests add column if not exists assigned_staff_id uuid references staff(id);
alter table arrival_requests add column if not exists fee_amount numeric(10, 2) not null default 30;
alter table arrival_requests add column if not exists fee_invoiced boolean not null default false;
alter table arrival_requests add column if not exists completed_at timestamptz;

-- Clients could already insert/read their own arrival requests; staff had no
-- access at all (the table was never referenced from the backoffice).
create policy "staff full access on arrival_requests"
  on arrival_requests for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

-- ---------------------------------------------------------------------------
-- Gap #10: Renewal Handling tracking (new table -- nothing existed for this)
-- ---------------------------------------------------------------------------
create table if not exists renewals (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  renewal_type text not null check (renewal_type in ('residency', 'utility', 'building_association', 'other')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_date date,
  assigned_staff_id uuid references staff(id),
  fee_amount numeric(10, 2) not null default 50,
  fee_invoiced boolean not null default false,
  notes text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_renewals_property on renewals(property_id);

alter table renewals enable row level security;

create policy "staff full access on renewals"
  on renewals for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

create policy "clients read own renewals"
  on renewals for select
  using (property_id in (select id from properties where client_id in (select id from clients where auth_id = auth.uid())));

-- ---------------------------------------------------------------------------
-- Wire the new sections into the Custom Roles access system, same as the
-- Emergency page migration did. Without this, even the owner can't see
-- /arrival-concierge or /renewals.
-- ---------------------------------------------------------------------------
insert into role_section_access (role_key, section)
select 'owner', s
from unnest(array['arrival_concierge', 'renewals']) as s
where not exists (
  select 1 from role_section_access where role_key = 'owner' and section = s
);
