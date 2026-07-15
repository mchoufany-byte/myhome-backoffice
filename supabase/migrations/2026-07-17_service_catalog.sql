-- Invoice line items had a free-text description field with no connection to
-- what things actually cost -- staff had to remember/retype prices from
-- scratch every time. This adds a services catalog (same admin-extensible
-- pattern as renewal_types) so line items can be picked from a dropdown that
-- prefills the price, while still allowing a one-off custom line when needed.
create table if not exists services (
  key text primary key,
  label text not null,
  default_price numeric(10, 2) not null default 0,
  is_system boolean not null default false,
  created_at timestamptz default now()
);

-- Starter set pulled from fee defaults already used elsewhere in the app
-- (maintenance coordination, arrival concierge, renewal handling). This is
-- deliberately NOT the full a la carte service menu from the pricing model --
-- add the rest of your real price list from the Renewal Handling-style
-- "+ Add new service" control on the invoice screen.
insert into services (key, label, default_price, is_system) values
  ('maintenance_coordination', 'Maintenance Coordination Fee', 25.00, true),
  ('arrival_concierge', 'Arrival Concierge', 30.00, true),
  ('renewal_handling', 'Renewal Handling', 50.00, true)
on conflict (key) do nothing;

alter table services enable row level security;

create policy "staff full access on services"
  on services for all
  using (auth_staff_role() is not null)
  with check (auth_staff_role() is not null);
