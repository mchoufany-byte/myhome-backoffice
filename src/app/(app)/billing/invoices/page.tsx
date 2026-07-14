import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { markInvoicePaid } from "./actions";
import { NewInvoiceForm } from "./NewInvoiceForm";
import { GenerateInvoicesButton } from "./GenerateInvoicesButton";

function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function clientLabel(c: any) {
  if (!c) return "—";
  return c.client_type === "company" && c.company_name ? c.company_name : c.name;
}

function InvoiceRow({ inv }: { inv: any }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <Link href={`/billing/invoices/${inv.id}`} className="text-sm font-medium text-ink hover:underline">
          {inv.invoice_number}
        </Link>
        <p className="text-xs text-ink/50 mt-0.5">
          {clientLabel(inv.clients)}
          {inv.billing_period ? ` · ${inv.billing_period}` : ""} · ${Number(inv.amount).toFixed(2)}
          {inv.due_date ? ` · Due ${shortDate(inv.due_date)}` : ""}
        </p>
      </div>
      <form action={markInvoicePaid} className="flex items-center gap-2 shrink-0">
        <input type="hidden" name="id" value={inv.id} />
        <select name="paid_from" className="border border-line bg-parchment text-xs px-2 py-1.5">
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="float">Utility Float</option>
        </select>
        <button type="submit" className="text-xs text-green font-medium whitespace-nowrap hover:underline">
          Mark Paid
        </button>
      </form>
    </div>
  );
}

export default async function InvoicesPage() {
  await requireSection("billing");
  const supabase = createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: invoices }, { data: clients }, { data: properties }] = await Promise.all([
    supabase
      .from("client_invoices")
      .select("id, invoice_number, billing_period, amount, status, issued_at, due_date, paid_at, notes, clients(id, name, client_type, company_name)")
      .order("issued_at", { ascending: false }),
    supabase.from("clients").select("id, name, client_type, company_name").order("name", { ascending: true }),
    supabase.from("properties").select("id, client_id, nickname, address, plan_tier"),
  ]);

  const outstanding = (invoices ?? []).filter((i: any) => i.status === "issued" && (!i.due_date || i.due_date >= today));
  const overdue = (invoices ?? []).filter((i: any) => i.status === "issued" && i.due_date && i.due_date < today);
  const paid = (invoices ?? []).filter((i: any) => i.status === "paid");
  const outstandingTotal = [...outstanding, ...overdue].reduce((s: number, i: any) => s + Number(i.amount), 0);

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/billing" className="text-xs text-ink/50 hover:text-ink">
        &larr; Back to Billing & Float
      </Link>
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold mt-3">Finance</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">Client Invoices</h1>
      <p className="text-sm text-ink/60 mb-6">
        ${outstandingTotal.toFixed(2)} outstanding across {outstanding.length + overdue.length} invoice
        {outstanding.length + overdue.length === 1 ? "" : "s"}.
      </p>

      <GenerateInvoicesButton />

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {overdue.length > 0 && (
            <section>
              <p className="text-[10.5px] font-semibold tracking-widest uppercase text-red mb-3">Overdue</p>
              <div className="bg-surface border border-red/30 divide-y divide-line">
                {overdue.map((inv: any) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Outstanding</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {outstanding.map((inv: any) => (
                <InvoiceRow key={inv.id} inv={inv} />
              ))}
              {!outstanding.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing outstanding.</p>}
            </div>
          </section>

          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Paid</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {paid.slice(0, 10).map((inv: any) => (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <Link href={`/billing/invoices/${inv.id}`} className="text-sm font-medium text-ink hover:underline">
                      {inv.invoice_number}
                    </Link>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {clientLabel(inv.clients)}
                      {inv.billing_period ? ` · ${inv.billing_period}` : ""} · ${Number(inv.amount).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-ink/50">{shortDate(inv.paid_at)}</p>
                </div>
              ))}
              {!paid.length && <p className="px-4 py-6 text-sm text-ink/50">No paid invoices yet.</p>}
            </div>
          </section>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Issue Invoice</p>
          <NewInvoiceForm clients={clients ?? []} properties={(properties ?? []) as any} />
        </div>
      </div>
    </div>
  );
}
