"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLAN_INFO, planTierOf } from "@/lib/packages";

type ClientOption = { id: string; name: string; client_type: string | null; company_name: string | null };
type PropertyOption = { id: string; client_id: string; nickname: string | null; address: string; plan_tier: string | null };

type LineItem = { description: string; amount: string; included: boolean };

function defaultBillingPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
}

export function NewInvoiceForm({ clients, properties }: { clients: ClientOption[]; properties: PropertyOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [clientId, setClientId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState(defaultBillingPeriod());
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientProperties = useMemo(() => properties.filter((p) => p.client_id === clientId), [properties, clientId]);

  function handleClientChange(id: string) {
    setClientId(id);
    const props = properties.filter((p) => p.client_id === id);
    setLineItems(
      props.map((p) => {
        const tier = planTierOf(p.plan_tier);
        const price = tier ? PLAN_INFO[tier].price : 0;
        return {
          description: `Monthly Package Fee — ${p.plan_tier ?? "—"} — ${p.nickname || p.address}`,
          amount: price ? price.toFixed(2) : "0.00",
          included: true,
        };
      })
    );
  }

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }

  function addCustomLine() {
    setLineItems((prev) => [...prev, { description: "", amount: "0.00", included: true }]);
  }

  function removeLine(i: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const total = lineItems.filter((li) => li.included).reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);

  function resetAll() {
    setClientId("");
    setBillingPeriod(defaultBillingPeriod());
    setDueDate(defaultDueDate());
    setNotes("");
    setLineItems([]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const included = lineItems.filter((li) => li.included && li.description.trim());
    if (!clientId) {
      setError("Select a client.");
      return;
    }
    if (!included.length) {
      setError("Add at least one line item.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("client_invoices").insert({
      client_id: clientId,
      billing_period: billingPeriod || null,
      line_items: included.map((li) => ({ description: li.description.trim(), amount: parseFloat(li.amount) || 0 })),
      amount: total,
      due_date: dueDate || null,
      notes: notes || null,
      status: "issued",
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    resetAll();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Client</label>
        <select
          value={clientId}
          onChange={(e) => handleClientChange(e.target.value)}
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        >
          <option value="">Select...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.client_type === "company" && c.company_name ? c.company_name : c.name}
            </option>
          ))}
        </select>
        {clientId && !clientProperties.length && (
          <p className="text-[10px] text-red mt-1">This client has no properties on file yet.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Billing Period</label>
          <input
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value)}
            placeholder="2026-07"
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
      </div>

      {lineItems.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs text-ink/60">Line Items</label>
          {lineItems.map((li, i) => (
            <div key={i} className="flex items-start gap-1.5 w-full min-w-0">
              <input
                type="checkbox"
                checked={li.included}
                onChange={(e) => updateLine(i, { included: e.target.checked })}
                className="mt-2.5 shrink-0"
              />
              <input
                value={li.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
                placeholder="Description"
                className="flex-1 min-w-0 border border-line bg-parchment px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                step="0.01"
                value={li.amount}
                onChange={(e) => updateLine(i, { amount: e.target.value })}
                onBlur={(e) => {
                  const n = parseFloat(e.target.value);
                  updateLine(i, { amount: (isNaN(n) ? 0 : n).toFixed(2) });
                }}
                className="w-16 shrink-0 border border-line bg-parchment px-1.5 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="text-ink/40 hover:text-red text-xs mt-1.5 px-1 shrink-0"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={addCustomLine} className="text-xs text-green font-medium hover:underline">
        + Add line
      </button>

      <div>
        <label className="block text-xs text-ink/60 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-xs text-ink/60 font-medium">Total</span>
        <span className="text-sm font-semibold text-ink">${total.toFixed(2)}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Issuing..." : "Issue Invoice"}
        </button>
        <button type="button" onClick={resetAll} className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line">
          Clear
        </button>
      </div>
    </form>
  );
}
