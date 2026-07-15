-- Restrict the services catalog (adding new services, changing prices) to
-- the owner role only. Every staff member with access to /services can still
-- read the catalog (needed for the order checklist) and allocate services to
-- clients -- they just can't add to or reprice the catalog itself.
drop policy if exists "staff full access on services" on services;

create policy "staff read services"
  on services for select
  using (auth_staff_role() is not null);

create policy "owner insert services"
  on services for insert
  with check (auth_staff_role() = 'owner');

create policy "owner update services"
  on services for update
  using (auth_staff_role() = 'owner')
  with check (auth_staff_role() = 'owner');

create policy "owner delete services"
  on services for delete
  using (auth_staff_role() = 'owner');
