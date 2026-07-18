-- Consolidated catch-up script covering everything from 2026-07-19: the
-- billing ledger's float history table, the Services tab, admin-only service
-- pricing, and the Buildings module. Safe to run even if some of this was
-- already applied -- every create is guarded (if not exists / drop-then-
-- create for policies) so re-running it is a no-op for anything that's
-- already there.

-- =============================================================
-- 1) Billing ledger: float transaction history + maintenance completed_at
-- =============================================================
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

drop policy if exists "staff full access on float_transactions" on float_transactions;
create policy "staff full access on float_transactions"
  on float_transactions for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

alter table maintenance_requests add column if not exists completed_at timestamptz;
update maintenance_requests set completed_at = created_at where status = 'completed' and completed_at is null;

-- =============================================================
-- 2) Services tab: service_orders table + nav access
-- =============================================================
create table if not exists service_orders (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  service_key text references services(key),
  description text not null,
  price numeric(10, 2) not null default 0,
  quantity integer not null default 1,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  fee_invoiced boolean not null default false,
  ordered_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  notes text,
  created_by uuid references staff(id)
);
create index if not exists idx_service_orders_client on service_orders(client_id);
create index if not exists idx_service_orders_property on service_orders(property_id);

alter table service_orders enable row level security;

drop policy if exists "staff full access on service_orders" on service_orders;
create policy "staff full access on service_orders"
  on service_orders for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

drop policy if exists "clients read own service orders" on service_orders;
create policy "clients read own service orders"
  on service_orders for select
  using (client_id in (select id from clients where auth_id = auth.uid()));

insert into role_section_access (role_key, section)
select 'owner', 'services'
where not exists (
  select 1 from role_section_access where role_key = 'owner' and section = 'services'
);

-- =============================================================
-- 3) Admin-only service catalog pricing
-- =============================================================
drop policy if exists "staff full access on services" on services;
drop policy if exists "staff read services" on services;
create policy "staff read services"
  on services for select
  using (auth_staff_role() is not null);

drop policy if exists "owner insert services" on services;
create policy "owner insert services"
  on services for insert
  with check (auth_staff_role() = 'owner');

drop policy if exists "owner update services" on services;
create policy "owner update services"
  on services for update
  using (auth_staff_role() = 'owner')
  with check (auth_staff_role() = 'owner');

drop policy if exists "owner delete services" on services;
create policy "owner delete services"
  on services for delete
  using (auth_staff_role() = 'owner');

-- =============================================================
-- 4) Buildings module
-- =============================================================
create table if not exists buildings (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  address text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_buildings_client on buildings(client_id);

create table if not exists building_units (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid not null references buildings(id) on delete cascade,
  unit_label text not null,
  owner_name text,
  contact_phone text,
  common_charge_amount numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_building_units_building on building_units(building_id);

create table if not exists building_charges (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid not null references buildings(id) on delete cascade,
  unit_id uuid not null references building_units(id) on delete cascade,
  period text not null,
  amount numeric(10, 2) not null,
  status text not null default 'due' check (status in ('due', 'paid')),
  due_date date,
  paid_at timestamptz,
  created_at timestamptz default now(),
  unique (unit_id, period)
);
create index if not exists idx_building_charges_building on building_charges(building_id);

create table if not exists building_suppliers (
  key text primary key,
  name text not null,
  category text,
  contact_phone text,
  contact_email text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists building_expenses (
  id uuid primary key default uuid_generate_v4(),
  building_id uuid not null references buildings(id) on delete cascade,
  category text not null check (category in ('generator', 'fuel', 'maintenance', 'other')),
  supplier_key text references building_suppliers(key),
  description text,
  amount numeric(10, 2) not null,
  expense_date date not null default current_date,
  created_by uuid references staff(id),
  created_at timestamptz default now()
);
create index if not exists idx_building_expenses_building on building_expenses(building_id);

alter table buildings enable row level security;
alter table building_units enable row level security;
alter table building_charges enable row level security;
alter table building_suppliers enable row level security;
alter table building_expenses enable row level security;

drop policy if exists "staff full access on buildings" on buildings;
create policy "staff full access on buildings"
  on buildings for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

drop policy if exists "staff full access on building_units" on building_units;
create policy "staff full access on building_units"
  on building_units for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

drop policy if exists "staff full access on building_charges" on building_charges;
create policy "staff full access on building_charges"
  on building_charges for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

drop policy if exists "staff full access on building_suppliers" on building_suppliers;
create policy "staff full access on building_suppliers"
  on building_suppliers for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

drop policy if exists "staff full access on building_expenses" on building_expenses;
create policy "staff full access on building_expenses"
  on building_expenses for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

insert into role_section_access (role_key, section)
select 'owner', 'buildings'
where not exists (
  select 1 from role_section_access where role_key = 'owner' and section = 'buildings'
);

-- =============================================================
-- 5) Grant coordinator + sales access to Services and Buildings
-- =============================================================
insert into role_section_access (role_key, section)
select cr.key, s.section
from custom_roles cr
cross join (values ('services'), ('buildings')) as s(section)
where (cr.label ilike 'coordinator' or cr.label ilike 'sales')
and not exists (
  select 1 from role_section_access rsa where rsa.role_key = cr.key and rsa.section = s.section
);
