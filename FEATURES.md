# My Home Backoffice — Feature Reference

A running record of what's built in the Gardien du Levant / Masterminds Corp staff backoffice. Grouped by sidebar section, in nav order. Access to every section is role-gated (Staff → Manage Roles); "Owner" sees everything by default.

## Dashboard
Landing overview when staff sign in — snapshot of what needs attention across the app.

## Properties
- Full property records: nickname, address, zone, plan tier (Basic/Standard/Premium), status, key custody, linked client.
- Add and edit properties, including package tier upgrades.
- Photo gallery per property.
- Per-property detail page bundling: recent visits, maintenance history, open items count, package/quota tracking, billing status, key custody log, and apartment health reports.
- **Key Custody Log** — chain-of-custody tracking every time a key is checked out or returned, who has it, expected return time.
- **Apartment Health Report** — structured scored report (water, HVAC, electrical, humidity, cleanliness, security, maintenance) filed periodically per property, with an overall score and recommendations.
- **Billing status** tracking (active / grace period / lapsed) with the ability to mark/confirm lapsed and reactivate.
- Client select on add/edit is required — a property can't be saved without an owner.

## Clients
- Individual and company client types, with company name for the latter.
- Primary contact, secondary contact, and emergency contact fields.
- Phone fields (all of them) use a country-code dropdown + validated local number, not free text.
- Client photo and a free-text feedback/notes field.
- Edit and per-record delete (role-permission gated).
- Multi-property support — one client can own several properties.

## Visits
- Schedule visits (Morning Visit, Scheduled Cleaning, Inspection, Pre-Arrival Deep Clean) against a property, with staff + optional second staff assignment (two-person visit policy).
- Reschedule (with reason) and cancel (with reason).
- **Mark Complete** — manually close out a visit even if the mobile app check-in/check-out wasn't used.
- Structured inspection checklist (water/plumbing, AC/heating, electrical, doors & windows, mailbox, pest signs, generator auto-start, mold/leak signs — each OK / Issue / N/A) plus free-text notes and recommendations, captured on Inspection-type visits.
- Visit dates can't be set in the past (scheduling and rescheduling both enforce this).

## Maintenance
- Log a maintenance request per property (title, description, vendor, quote amount/URL).
- Mark completed with a coordination fee — feeds into client invoicing.
- Fee-invoiced tracking so completed jobs aren't billed twice.

## Emergency
- Incident queue with status/resolution tracking and resolution notes.
- Staff assignment.

## Arrival Concierge
- Fulfillment queue for arrival requests (airport pickup, flowers, groceries, temperature preset, lights at dusk, linen cleaning, notes).
- Assign staff, mark completed with a fee — feeds into client invoicing.

## Renewals
- Track residency/utility/building-association/other renewal tasks per property, with due date, assigned staff, fee, notes.
- **Editable** — renewal type, due date, fee, and notes can all be amended after creation.
- **Custom renewal types** — admin-extensible catalog, not a fixed list, with an inline "+ Add new type."
- Assign staff and mark completed (captures the fee); completed-and-unbilled fees flow into monthly invoicing.
- Due dates can't be set in the past.

## Services
- **Services catalog** — a la carte service menu (name + price), admin-extensible. Adding new services and changing prices is **owner-only**; everyone with Services access can still see and use the catalog.
- **Order Service** — a checklist of catalog services (prices shown) plus quantity, allocated to a specific client (and optional property) in one submission; also supports a one-off custom line item.
- Pending Fulfillment / Fulfilled / Cancelled tracking per order.
- A fulfilled order becomes an unbilled fee immediately, visible in the Client Billing Ledger, and folds into that client's invoice the next time monthly invoices are generated — works even for clients with no active property record.

## Buildings
For clients managed as a whole building rather than a single apartment.
- **Flats/units** — individually tracked (label, owner/tenant name, contact, its own recurring common-charge amount), add/deactivate.
- **Common Charges** — one-click "Generate This Month's Common Charges" creates a due charge per active flat at its set rate; safe to click repeatedly (skips flats already charged that period). Mark each paid.
- **Generator / Fuel / Other Expenses** — manually logged (category, supplier, amount, date, description) since amounts vary run to run.
- **Supplier directory** — shared across all buildings, with inline "+ Add new supplier" from the expense form.
- **Cash Ledger** — running balance per building (common charges collected in, expenses out), filterable by type and date, with a summary strip (expected / collected / flats outstanding / expenses for the current month).
- Access: Owner, Coordinator, Sales.

## Billing & Float
- **Utility bills** — log bills by category (Building, Electricity, Generator, Internet, Water — admin-extensible catalog), mark paid via Utility Float, Client Direct, or Company Advance.
- **Utility Float** — a prepaid per-property balance for utility bills; top up manually, automatically drawn down when a bill is paid from it. Full top-up/draw history retained (not just a running number).
- **Client Invoices** (sub-page) — issue invoices with line items picked from the Services catalog (auto-fills price) or free text; monthly package fee auto-included per property. **Generate Monthly Invoices** bulk-creates one invoice per client per period, automatically pulling in any completed-and-unbilled maintenance/arrival/renewal/service fees, and is safe to run more than once (skips clients already invoiced for the period). Mark paid (Bank Transfer / Cash / Utility Float) or void.
- **Client Billing Ledger** (sub-page) — every charge and payment for every client in one place: invoices, utility bills, float top-ups/draws, and renewal/maintenance/arrival/service fees (visible the moment they're marked complete, before they're even invoiced). Filterable by client, date range, and type, with a monthly Advance Payments / Paid / Due breakdown.
- Invoice due dates are derived consistently from the billing period (period start + 15 days), not "today," so every invoice for the same month lands on the same due date. No due date can be set in the past.

## Documents
Central place for property/client-related files.

## Staff
- Add staff with job title, contact info, availability.
- Deactivate / reactivate.
- **Custom Roles** — admin-defined roles (not a fixed list), each with its own set of visible sections, managed under Staff → Manage Roles.
- Per-role section access controls what appears in the sidebar and blocks direct URL access to anything not granted.

## Analytics
KPI dashboard — operational metrics at a glance.

## Audit Log
- Every write action across the app is logged: creates, edits, assignments, status changes, completions, cancellations, deletes, payments, top-ups, and more (~20 distinct action types).
- Grouped by staff member, most recent first within each group, so it's easy to see "what has this person done."

---

## Cross-cutting hardening (applies app-wide)
- **Phone numbers** — country-code dropdown + validated local number on every phone field, not free text.
- **Numeric fields** (fees, amounts) — reject negative and non-numeric input, both in the browser (`min`, live clamping) and on the server.
- **Required fields** — every field that's logically mandatory (client/property selects, amounts, dates) enforces as required in the browser and is checked again server-side before writing to the database.
- **Dates** — nothing that represents a future commitment (visit date, due date, expected key return) can be set in the past; expense/log dates that record something that already happened are unrestricted.
- **Payment method** — no longer silently defaults to "Bank Transfer" for clients who haven't actually chosen one, in either the backoffice or the mobile app.
