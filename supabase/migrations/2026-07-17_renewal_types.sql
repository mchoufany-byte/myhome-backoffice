-- Renewal Handling: renewal_type was a fixed 4-value list baked into a CHECK
-- constraint (residency/utility/building_association/other) with no way to
-- add new types without a schema change. This makes the type list a proper
-- reference table staff can add to from the Renewal Handling screen, same
-- extensibility pattern as custom_roles.
create table if not exists renewal_types (
  key text primary key,
  label text not null,
  is_system boolean not null default false,
  created_at timestamptz default now()
);

insert into renewal_types (key, label, is_system) values
  ('residency', 'Residency', true),
  ('utility', 'Utility', true),
  ('building_association', 'Building Association', true),
  ('other', 'Other', true)
on conflict (key) do nothing;

alter table renewal_types enable row level security;

create policy "staff full access on renewal_types"
  on renewal_types for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

-- Swap the fixed-list CHECK for a foreign key against renewal_types -- the
-- default constraint name for an unnamed single-column check is
-- "<table>_<column>_check", which is what was created in
-- 2026-07-15_next_tier_billing.sql.
alter table renewals drop constraint if exists renewals_renewal_type_check;
alter table renewals add constraint renewals_renewal_type_fkey
  foreign key (renewal_type) references renewal_types(key);
