-- New Services tab: manage the services catalog in one place, and log when a
-- client orders one of those services (allocation), independent of the
-- maintenance/arrival/renewal pipelines that already generate their own fees.
-- A service order becomes an unbilled fee just like those do, and folds into
-- the client's invoice via the same Generate Monthly Invoices batch.
create table if not exists service_orders (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  service_key text references services(key),
  -- Snapshot of the service's label at order time so a later rename/delete of
  -- the catalog entry doesn't rewrite history.
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

create policy "staff full access on service_orders"
  on service_orders for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

create policy "clients read own service orders"
  on service_orders for select
  using (client_id in (select id from clients where auth_id = auth.uid()));

-- Wire the new /services page into the Custom Roles access system (same
-- pattern as the Renewals/Arrival Concierge migration) -- without this, even
-- the owner role can't see the nav link.
insert into role_section_access (role_key, section)
select 'owner', 'services'
where not exists (
  select 1 from role_section_access where role_key = 'owner' and section = 'services'
);
