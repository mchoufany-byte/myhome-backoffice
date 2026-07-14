-- Critical Gaps migration (from Backend & App Gap Analysis, July 2026)
-- Covers gaps #1, #3, #4, #5. Run this once in the Supabase SQL editor,
-- then deploy the corresponding app code.
--
-- This is also the first schema change in this project checked into git --
-- see the "schema drift" note in the gap analysis. Going forward, every
-- schema change should get a dated file in supabase/migrations/ like this one.

-- ---------------------------------------------------------------------------
-- Gap #5: Two-person visit support
-- ---------------------------------------------------------------------------
alter table visits add column if not exists second_staff_id uuid references staff(id);

-- ---------------------------------------------------------------------------
-- Gap #1: Apartment Health Report generation
-- ---------------------------------------------------------------------------
alter table health_scores add column if not exists recommendations text;

-- Clients could already read their own health_scores; staff had no write
-- access at all (nothing ever inserted a row). Add it.
create policy "staff full access on health_scores"
  on health_scores for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

-- ---------------------------------------------------------------------------
-- Gap #3: Emergency incident queue + SLA
-- ---------------------------------------------------------------------------
alter table emergency_incidents add column if not exists assigned_staff_id uuid references staff(id);

-- Clients could already file/read their own incidents; staff had no access
-- at all (the table was never referenced from the backoffice).
create policy "staff full access on emergency_incidents"
  on emergency_incidents for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

-- ---------------------------------------------------------------------------
-- Gap #4: Key custody chain-of-custody log
-- ---------------------------------------------------------------------------
create table if not exists key_custody_events (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  staff_id uuid references staff(id),
  action text not null check (action in ('checkout', 'return')),
  purpose text,
  expected_return_at timestamptz,
  logged_at timestamptz default now(),
  notes text
);
create index if not exists idx_key_custody_property on key_custody_events(property_id);

alter table key_custody_events enable row level security;

create policy "staff full access on key_custody_events"
  on key_custody_events for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);

create policy "clients read own key custody log"
  on key_custody_events for select
  using (property_id in (select id from properties where client_id in (select id from clients where auth_id = auth.uid())));

-- ---------------------------------------------------------------------------
-- Wire the new Emergency page into the existing Custom Roles access system.
-- Without this, even the owner role can't see /emergency (requireSection
-- checks role_section_access, nothing bypasses it). Other roles can be
-- granted access later from Staff -> Manage Roles.
-- ---------------------------------------------------------------------------
insert into role_section_access (role_key, section)
select 'owner', 'emergency'
where not exists (
  select 1 from role_section_access where role_key = 'owner' and section = 'emergency'
);
