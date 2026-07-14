import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { markInvoicePaid, voidInvoice } from "../actions";
import { PrintButton } from "./PrintButton";

const COMPANY = {
  name: "GARDIEN DU LEVANT",
  legal: "A trade name of Masterminds Corporation",
  tagline: "Residential Asset Management",
  location: "Beirut, Lebanon",
  email: "hello@gardiendulevant.com",
};

function fullDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  issued: "Outstanding",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  await requireSection("billing");
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("client_invoices")
    .select(
      "id, invoice_number, billing_period, line_items, amount, status, issued_at, due_date, paid_at, paid_from, notes, clients(id, name, email, phone, client_type, company_name, cr_number)"
    )
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const client: any = invoice.clients;
  const isOverdue = invoice.status === "issued" && invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10);
  const statusKey = isOverdue ? "overdue" : invoice.status;
  const lineItems: { description: string; amount: number }[] = Array.isArray(invoice.line_items) ? (invoice.line_items as any) : [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="no-print flex items-center justify-between mb-6">
        <Link href="/billing/invoices" className="text-xs text-ink/50 hover:text-ink">
          &larr; Client Invoices
        </Link>
        <div className="flex items-center gap-2">
          {invoice.status === "issued" && (
            <form action={markInvoicePaid} className="flex items-center gap-2">
              <input type="hidden" name="id" value={invoice.id} />
              <select name="paid_from" className="border border-line bg-parchment text-xs px-2 py-1.5">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="float">Utility Float</option>
              </select>
              <button type="submit" className="text-xs text-green font-medium hover:underline">
                Mark Paid
              </button>
            </form>
          )}
          {invoice.status !== "paid" && invoice.status !== "void" && (
            <form action={voidInvoice}>
              <input type="hidden" name="id" value={invoice.id} />
              <button type="submit" className="text-xs text-ink/40 hover:text-red hover:underline">
                Void
              </button>
            </form>
          )}
          <PrintButton />
        </div>
      </div>

      <div className="bg-surface border border-line p-10 print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-line pb-6 mb-6">
          <div>
            <p className="text-lg font-serif text-green">{COMPANY.name}</p>
            <p className="text-xs text-ink/50">{COMPANY.tagline}</p>
            <p className="text-xs text-ink/40 mt-1">{COMPANY.legal}</p>
            <p className="text-xs text-ink/40">{COMPANY.location} · {COMPANY.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-serif text-ink">Invoice</p>
            <p className="text-sm text-ink/60 mt-1">{invoice.invoice_number}</p>
            <span
              className={`inline-block mt-2 text-[10px] px-2 py-1 border uppercase tracking-wide ${
                statusKey === "paid"
                  ? "border-green text-green"
                  : statusKey === "overdue"
                  ? "border-red text-red"
                  : "border-line text-ink/60"
              }`}
            >
              {STATUS_LABEL[statusKey]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gold mb-1.5">Bill To</p>
            <p className="text-sm font-medium text-ink">
              {client?.client_type === "company" && client?.company_name ? client.company_name : client?.name ?? "—"}
            </p>
            {client?.client_type === "company" && client?.company_name && (
              <p className="text-xs text-ink/50">Attn: {client.name}</p>
            )}
            {client?.client_type === "company" && client?.cr_number && (
              <p className="text-xs text-ink/50">CR: {client.cr_number}</p>
            )}
            <p className="text-xs text-ink/50 mt-0.5">{client?.email ?? ""}</p>
            <p className="text-xs text-ink/50">{client?.phone ?? ""}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gold mb-1.5">Details</p>
            {invoice.billing_period && <p className="text-xs text-ink/70">Billing Period: {invoice.billing_period}</p>}
            <p className="text-xs text-ink/70">Issue Date: {fullDate(invoice.issued_at)}</p>
            <p className="text-xs text-ink/70">Due Date: {fullDate(invoice.due_date)}</p>
            {invoice.status === "paid" && <p className="text-xs text-green mt-0.5">Paid {fullDate(invoice.paid_at)}</p>}
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-2 font-medium text-ink/60 text-xs uppercase tracking-wide">Description</th>
              <th className="py-2 font-medium text-ink/60 text-xs uppercase tracking-wide text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, i) => (
              <tr key={i} className="border-b border-line/50">
                <td className="py-2.5 text-ink">{li.description}</td>
                <td className="py-2.5 text-ink text-right">${Number(li.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-48 flex items-center justify-between border-t border-line pt-2">
            <span className="text-sm font-medium text-ink">Total</span>
            <span className="text-base font-semibold text-ink">${Number(invoice.amount).toFixed(2)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="border-t border-line pt-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gold mb-1.5">Notes</p>
            <p className="text-xs text-ink/60 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
