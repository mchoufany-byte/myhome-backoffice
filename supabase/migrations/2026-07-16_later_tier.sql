-- "Later" tier migration (from Backend & App Gap Analysis, July 2026)
-- Covers gaps #14 (billing status / grace period), #17 (inspection checklist),
-- #18 (KPI dashboard -- no schema needed, computed from existing tables),
-- #19 (audit log), #20 (role-driven delete permission). Run once in the
-- Supabase SQL editor, then deploy the corresponding app code.

-- ---------------------------------------------------------------------------
-- Gap #14: Billing status / grace period tracking
-- ---------------------------------------------------------------------------
alter table properties add column if not exists billing_status text not null default 'active'
  check (billing_status in ('active', 'grace_period', 'lapsed'));
alter table properties add column if not exists lapsed_at timestamptz;

-- Grace period is a fixed 7 days from lapsed_at (business plan §9.5). Rather
-- than a cron job flipping grace_period -> lapsed automatically, the
-- backoffice computes "is the 7 days up yet" on read and shows it, and staff
-- confirm the transition -- keeps a human in the loop on anything that
-- affects a client's service.

-- Block new client-submitted service requests and arrival concierge requests
-- once a property is fully lapsed (not just in grace period). Deliberately
-- does NOT touch emergency_incidents -- clients can always report an
-- emergency regardless of billing status -- and does NOT touch SELECT, so
-- clients can still see their history (this is "paused", not "locked out").
create policy "block requests when property lapsed"
  on requests as restrictive for insert
  with check (
    exists (
      select 1 from properties p
      where p.id = requests.property_id
      and coalesce(p.billing_status, 'active') <> 'lapsed'
    )
  );

create policy "block arrival requests when property lapsed"
  on arrival_requests as restrictive for insert
  with check (
    exists (
      select 1 from properties p
      where p.id = arrival_requests.property_id
      and coalesce(p.billing_status, 'active') <> 'lapsed'
    )
  );

-- ---------------------------------------------------------------------------
-- Gap #17: Structured inspection checklist
-- ---------------------------------------------------------------------------
alter table visits add column if not exists inspection_checklist jsonb;

-- ---------------------------------------------------------------------------
-- Gap #19: Audit log for high-risk actions
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id),
  staff_name text,
  action text not null,
  table_name text not null,
  record_id uuid,
  detail text,
  created_at timestamptz default now()
);
create index if not exists idx_audit_log_created on audit_log(created_at desc);

alter table audit_log enable row level security;

create policy "staff full access on audit_log"
  on audit_log for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

-- ---------------------------------------------------------------------------
-- Gap #20: Role-driven delete permission (currently hardcoded to the
-- literal 'owner' role in the UI for clients/properties -- this makes it
-- admin-configurable via the Custom Roles screen instead).
-- ---------------------------------------------------------------------------
alter table custom_roles add column if not exists can_delete boolean not null default false;
update custom_roles set can_delete = true where key = 'owner';

create or replace function auth_staff_can_delete()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(cr.can_delete, false)
  from staff s
  join custom_roles cr on cr.key = s.role
  where s.auth_id = auth.uid()
  limit 1;
$$;

-- Adds a role-driven delete check for clients/properties on top of whatever
-- delete policy already exists on these tables. If you previously locked
-- deletes to the literal 'owner' role at the database level (separate from
-- this migration), that older policy still applies and will need to be
-- dropped for a non-owner role's "can delete" grant to actually take effect
-- -- run the check query at the bottom of this file to see what's there.
create policy "role-driven delete on clients"
  on clients as restrictive for delete
  using (auth_staff_can_delete());

create policy "role-driven delete on properties"
  on properties as restrictive for delete
  using (auth_staff_can_delete());

-- ---------------------------------------------------------------------------
-- Wire the new sections into the Custom Roles access system.
-- ---------------------------------------------------------------------------
insert into role_section_access (role_key, section)
select 'owner', s
from unnest(array['analytics', 'audit_log']) as s
where not exists (
  select 1 from role_section_access where role_key = 'owner' and section = s
);

-- ---------------------------------------------------------------------------
-- OPTIONAL: run this SELECT separately afterward to see every existing
-- delete-related policy on clients/properties, so we can tell whether an
-- older owner-only policy needs to be dropped. Paste the results back if
-- you want help interpreting them.
-- ---------------------------------------------------------------------------
-- select schemaname, tablename, policyname, permissive, cmd, qual
-- from pg_policies
-- where tablename in ('clients', 'properties') and cmd = 'DELETE';
