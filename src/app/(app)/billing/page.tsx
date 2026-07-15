import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { markBillPaid, topUpFloat } from "./actions";
import { NewBillForm } from "./NewBillForm";

function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function BillingPage() {
  const currentStaff = await requireSection("billing");
  const supabase = createClient();

  const [{ data: bills }, { data: floats }, { data: properties }, { data: invoices }, { data: billCategories }] = await Promise.all([
    supabase
      .from("bills")
      .select(
        "id, category, amount, billing_period, status, paid_from, paid_at, created_at, invoice_url, properties(nickname, address)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("utility_float")
      .select("property_id, balance, last_topup_amount, last_topup_at, properties(nickname, address)")
      .order("balance", { ascending: true }),
    supabase.from("properties").select("id, nickname, address").order("nickname", { ascending: true }),
    supabase.from("client_invoices").select("id, amount, status, due_date"),
    supabase.from("bill_categories").select("key, label, is_system").order("label", { ascending: true }),
  ]);

  const due = bills?.filter((b) => b.status === "due") ?? [];
  const paid = bills?.filter((b) => b.status === "paid") ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const outstandingInvoices = (invoices ?? []).filter((i) => i.status === "issued");
  const outstandingInvoiceTotal = outstandingInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const overdueInvoiceCount = outstandingInvoices.filter((i) => i.due_date && i.due_date < today).length;

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Finance</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Billing & Float</h1>

      <Link
        href="/billing/invoices"
        className="block bg-surface border border-line p-4 mb-8 hover:border-green transition-colors max-w-md"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Client Invoices</p>
            <p className="text-sm text-ink/60 mt-1">
              ${outstandingInvoiceTotal.toFixed(2)} outstanding
              {overdueInvoiceCount > 0 && <span className="text-red"> · {overdueInvoiceCount} overdue</span>}
            </p>
          </div>
          <span className="text-green text-sm font-medium">Manage &rarr;</span>
        </div>
      </Link>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Due</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {due.map((b: any) => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink capitalize">{b.category}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {b.properties?.nickname || b.properties?.address}
                      {b.billing_period ? ` · ${b.billing_period}` : ""} · ${Number(b.amount).toFixed(2)}
                    </p>
                    {b.invoice_url && (
                      <a
                        href={b.invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green font-medium hover:underline mt-1 inline-block"
                      >
                        View Invoice &rarr;
                      </a>
                    )}
                  </div>
                  <form action={markBillPaid} className="flex items-center gap-2 shrink-0">
                    <input type="hidden" name="id" value={b.id} />
                    <select name="paid_from" className="border border-line bg-parchment text-xs px-2 py-1.5">
                      <option value="float">Utility Float</option>
                      <option value="client">Client Direct</option>
                      <option value="company">Company Advance</option>
                    </select>
                    <button type="submit" className="text-xs text-green font-medium whitespace-nowrap hover:underline">
                      Mark Paid
                    </button>
                  </form>
                </div>
              ))}
              {!due.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing due.</p>}
            </div>
          </section>

          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Recently Paid</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {paid.slice(0, 8).map((b: any) => (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink capitalize">{b.category}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {b.properties?.nickname || b.properties?.address} · ${Number(b.amount).toFixed(2)}
                    </p>
                    {b.invoice_url && (
                      <a
                        href={b.invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green font-medium hover:underline mt-1 inline-block"
                      >
                        View Invoice &rarr;
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-ink/50">{shortDate(b.paid_at)}</p>
                </div>
              ))}
              {!paid.length && <p className="px-4 py-6 text-sm text-ink/50">No paid bills yet.</p>}
            </div>
          </section>

          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Utility Float Balances</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {floats?.map((f: any) => (
                <div key={f.property_id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{f.properties?.nickname || f.properties?.address}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      Last top-up: {f.last_topup_amount ? `$${Number(f.last_topup_amount).toFixed(2)}` : "—"}
                      {f.last_topup_at ? ` on ${shortDate(f.last_topup_at)}` : ""}
                    </p>
                  </div>
                  <p className={`text-sm font-medium ${Number(f.balance) < 50 ? "text-red" : "text-ink"}`}>
                    ${Number(f.balance ?? 0).toFixed(2)}
                  </p>
                </div>
              ))}
              {!floats?.length && <p className="px-4 py-6 text-sm text-ink/50">No float accounts yet.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">New Bill</p>
            <NewBillForm
              properties={properties ?? []}
              categories={billCategories ?? []}
              currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
            />
          </div>

          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Top Up Float</p>
            <form key={Date.now()} action={topUpFloat} className="bg-surface border border-line p-4 space-y-3">
              <div>
                <label className="block text-xs text-ink/60 mb-1">Property</label>
                <select name="property_id" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
                  <option value="">Select...</option>
                  {properties?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname || p.address}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Amount ($)</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-gold text-parchment text-sm font-medium py-2.5">
                  Top Up
                </button>
                <button type="reset" className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line">
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
