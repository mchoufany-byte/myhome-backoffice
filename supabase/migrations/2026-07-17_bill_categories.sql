-- Bill categories (electricity/generator/water/building/internet) were a
-- hardcoded JS array in NewBillForm.tsx -- adding a new utility type meant a
-- code change. Same admin-extensible catalog pattern as renewal_types and
-- services: a reference table staff can add to right from the New Bill form.
--
-- Deliberately a separate table from `services` (the invoice line-item
-- catalog) -- a bill category is a utility cost paid on the client's behalf,
-- a service is a fee charged to the client. Keeping them apart avoids
-- "Deep Cleaning" showing up as a utility bill type or "Electricity" showing
-- up as something you'd invoice a client for.
create table if not exists bill_categories (
  key text primary key,
  label text not null,
  is_system boolean not null default false,
  created_at timestamptz default now()
);

insert into bill_categories (key, label, is_system) values
  ('electricity', 'Electricity', true),
  ('generator', 'Generator', true),
  ('water', 'Water', true),
  ('building', 'Building', true),
  ('internet', 'Internet', true)
on conflict (key) do nothing;

alter table bill_categories enable row level security;

create policy "staff full access on bill_categories"
  on bill_categories for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);
