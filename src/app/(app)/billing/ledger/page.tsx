import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { LedgerView, LedgerEntry } from "./LedgerView";

export default async function BillingLedgerPage() {
  await requireSection("billing");
  const supabase = createClient();

  const [
    { data: clients },
    { data: properties },
    { data: invoices },
    { data: bills },
    { data: floatTx },
    { data: renewals },
    { data: renewalTypes },
    { data: maintenance },
    { data: arrivals },
    { data: serviceOrders },
  ] = await Promise.all([
    supabase.from("clients").select("id, name, client_type, company_name").order("name", { ascending: true }),
    supabase.from("properties").select("id, client_id, nickname, address"),
    supabase
      .from("client_invoices")
      .select("id, client_id, invoice_number, billing_period, amount, status, issued_at"),
    supabase.from("bills").select("id, property_id, category, amount, status, paid_from, paid_at, created_at"),
    supabase.from("float_transactions").select("id, property_id, type, amount, bill_id, created_at"),
    supabase.from("renewals").select("id, property_id, renewal_type, fee_amount, fee_invoiced, status, completed_at"),
    supabase.from("renewal_types").select("key, label"),
    supabase
      .from("maintenance_requests")
      .select("id, property_id, title, coordination_fee, fee_invoiced, status, completed_at"),
    supabase
      .from("arrival_requests")
      .select("id, property_id, arrival_date, fee_amount, fee_invoiced, status, completed_at"),
    supabase
      .from("service_orders")
      .select("id, client_id, description, price, quantity, status, fee_invoiced, ordered_at, fulfilled_at"),
  ]);

  const propertyLabel = new Map(
    (properties ?? []).map((p) => [p.id, p.nickname || p.address])
  );
  const propertyClient = new Map((properties ?? []).map((p) => [p.id, p.client_id]));
  const renewalTypeLabel = new Map((renewalTypes ?? []).map((t) => [t.key, t.label]));

  const entries: LedgerEntry[] = [];

  for (const inv of invoices ?? []) {
    entries.push({
      id: `invoice-${inv.id}`,
      clientId: inv.client_id,
      date: inv.issued_at,
      type: "invoice",
      label: `Invoice ${inv.invoice_number ?? ""}`.trim(),
      detail: inv.billing_period ?? "",
      amount: Number(inv.amount ?? 0),
      status: inv.status ?? "issued",
      href: `/billing/invoices/${inv.id}`,
    });
  }

  for (const b of bills ?? []) {
    const clientId = propertyClient.get(b.property_id) ?? null;
    entries.push({
      id: `bill-${b.id}`,
      clientId,
      date: b.paid_at ?? b.created_at,
      type: "bill",
      label: `Utility Bill — ${b.category}`,
      detail: propertyLabel.get(b.property_id) ?? "",
      amount: Number(b.amount ?? 0),
      status: b.status === "paid" ? `Paid via ${b.paid_from ?? "—"}` : "Due",
    });
  }

  for (const t of floatTx ?? []) {
    const clientId = propertyClient.get(t.property_id) ?? null;
    entries.push({
      id: `float-${t.id}`,
      clientId,
      date: t.created_at,
      type: t.type === "topup" ? "float_topup" : "float_draw",
      label: t.type === "topup" ? "Float Top-Up" : "Float Draw (bill paid)",
      detail: propertyLabel.get(t.property_id) ?? "",
      amount: Number(t.amount ?? 0),
      status: t.type === "topup" ? "Deposited" : "Spent",
    });
  }

  for (const r of renewals ?? []) {
    if (r.status !== "completed" || r.fee_amount == null) continue;
    const clientId = propertyClient.get(r.property_id) ?? null;
    entries.push({
      id: `renewal-${r.id}`,
      clientId,
      date: r.completed_at,
      type: "renewal_fee",
      label: `Renewal Fee — ${renewalTypeLabel.get(r.renewal_type) ?? r.renewal_type}`,
      detail: propertyLabel.get(r.property_id) ?? "",
      amount: Number(r.fee_amount ?? 0),
      status: r.fee_invoiced ? "Invoiced" : "Pending invoice",
    });
  }

  for (const m of maintenance ?? []) {
    if (m.status !== "completed" || m.coordination_fee == null) continue;
    const clientId = propertyClient.get(m.property_id) ?? null;
    entries.push({
      id: `maintenance-${m.id}`,
      clientId,
      date: m.completed_at,
      type: "maintenance_fee",
      label: `Maintenance Fee — ${m.title}`,
      detail: propertyLabel.get(m.property_id) ?? "",
      amount: Number(m.coordination_fee ?? 0),
      status: m.fee_invoiced ? "Invoiced" : "Pending invoice",
    });
  }

  for (const a of arrivals ?? []) {
    if (a.status !== "completed" || a.fee_amount == null) continue;
    const clientId = propertyClient.get(a.property_id) ?? null;
    entries.push({
      id: `arrival-${a.id}`,
      clientId,
      date: a.completed_at,
      type: "arrival_fee",
      label: `Arrival Concierge Fee${a.arrival_date ? ` — ${a.arrival_date}` : ""}`,
      detail: propertyLabel.get(a.property_id) ?? "",
      amount: Number(a.fee_amount ?? 0),
      status: a.fee_invoiced ? "Invoiced" : "Pending invoice",
    });
  }

  for (const so of serviceOrders ?? []) {
    if (so.status !== "fulfilled") continue;
    entries.push({
      id: `service-${so.id}`,
      clientId: so.client_id,
      date: so.fulfilled_at ?? so.ordered_at,
      type: "service_fee",
      label: so.description,
      detail: so.quantity > 1 ? `x${so.quantity}` : "",
      amount: Number(so.price ?? 0) * so.quantity,
      status: so.fee_invoiced ? "Invoiced" : "Pending invoice",
    });
  }

  entries.sort((x, y) => new Date(y.date ?? 0).getTime() - new Date(x.date ?? 0).getTime());

  const clientOptions = (clients ?? []).map((c) => ({
    id: c.id,
    label: c.client_type === "company" && c.company_name ? c.company_name : c.name,
  }));

  return (
    <div className="p-8 max-w-6xl">
      <Link href="/billing" className="text-xs text-ink/50 hover:text-ink">
        &larr; Back to Billing & Float
      </Link>
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold mt-3">Finance</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">Client Billing Ledger</h1>
      <p className="text-sm text-ink/60 mb-6">
        Every charge and payment across invoices, utility bills, the float, and completed service fees — filterable
        by client, date, and type. Renewal, maintenance, and Arrival Concierge fees show up here the moment they're
        marked completed, even before they've been folded into an invoice.
      </p>

      <LedgerView entries={entries} clients={clientOptions} />
    </div>
  );
}
