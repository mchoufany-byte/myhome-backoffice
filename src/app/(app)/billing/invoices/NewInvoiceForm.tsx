"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PLAN_INFO, planTierOf } from "@/lib/packages";
import { dueDateForPeriod } from "@/lib/billing";
import { logAudit } from "@/lib/audit";

type ClientOption = { id: string; name: string; client_type: string | null; company_name: string | null };
type PropertyOption = { id: string; client_id: string; nickname: string | null; address: string; plan_tier: string | null };
type ServiceOption = { key: string; label: string; default_price: number; is_system: boolean };

// "property" lines are the auto-generated Monthly Package Fee rows (one per
// property, driven by plan tier) -- their description stays freely editable
// text. "catalog" lines are anything added via "+ Add line" and are picked
// from the services catalog dropdown, which prefills description + price.
type LineItem = { description: string; amount: string; included: boolean; source: "property" | "catalog"; serviceKey?: string };

function defaultBillingPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function NewInvoiceForm({
  clients,
  properties,
  services,
  currentStaff,
}: {
  clients: ClientOption[];
  properties: PropertyOption[];
  services: ServiceOption[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [clientId, setClientId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState(defaultBillingPeriod());
  // Due date tracks the billing period (period start + 15 days) so every
  // invoice for the same period lands on the same due date -- it stays
  // editable below for genuine one-off exceptions.
  const [dueDate, setDueDate] = useState(dueDateForPeriod(defaultBillingPeriod()));
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<ServiceOption[]>(services);
  const [addingService, setAddingService] = useState(false);
  const [newServiceLabel, setNewServiceLabel] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [addServiceError, setAddServiceError] = useState<string | null>(null);
  const [addServiceSaving, setAddServiceSaving] = useState(false);

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
          source: "property" as const,
        };
      })
    );
  }

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLineItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }

  function addLine() {
    const first = catalog[0];
    setLineItems((prev) => [
      ...prev,
      first
        ? { description: first.label, amount: first.default_price.toFixed(2), included: true, source: "catalog", serviceKey: first.key }
        : { description: "", amount: "0.00", included: true, source: "catalog", serviceKey: "" },
    ]);
  }

  function handleServiceSelect(i: number, key: string) {
    if (!key) {
      // "Custom..." -- clear the service link but keep the line, description
      // becomes freely editable.
      updateLine(i, { serviceKey: "", description: "" });
      return;
    }
    const svc = catalog.find((s) => s.key === key);
    if (!svc) return;
    updateLine(i, { serviceKey: key, description: svc.label, amount: svc.default_price.toFixed(2) });
  }

  function removeLine(i: number) {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleAddService() {
    const label = newServiceLabel.trim();
    const price = parseFloat(newServicePrice);
    if (!label) {
      setAddServiceError("Enter a name for the new service.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setAddServiceError("Price must be a number of 0 or more.");
      return;
    }
    const key = slugify(label);
    if (!key) {
      setAddServiceError("That name can't be turned into a valid service key.");
      return;
    }
    if (catalog.some((s) => s.key === key)) {
      setAddServiceError("A service with that name already exists.");
      return;
    }
    setAddServiceSaving(true);
    setAddServiceError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("services")
      .insert({ key, label, default_price: price, is_system: false });
    setAddServiceSaving(false);
    if (insertError) {
      setAddServiceError(insertError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "create", "services", key, `Created service ${label}`);

    const newService = { key, label, default_price: price, is_system: false };
    setCatalog((prev) => [...prev, newService].sort((a, b) => a.label.localeCompare(b.label)));
    setLineItems((prev) => [
      ...prev,
      { description: label, amount: price.toFixed(2), included: true, source: "catalog", serviceKey: key },
    ]);
    setNewServiceLabel("");
    setNewServicePrice("");
    setAddingService(false);
    router.refresh();
  }

  const total = lineItems.filter((li) => li.included).reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);

  function resetAll() {
    const period = defaultBillingPeriod();
    setClientId("");
    setBillingPeriod(period);
    setDueDate(dueDateForPeriod(period));
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
    if (included.some((li) => !Number.isFinite(parseFloat(li.amount)) || parseFloat(li.amount) < 0)) {
      setError("Every line item amount must be a number of 0 or more.");
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

    await logAudit(supabase, currentStaff, "issue", "client_invoices", null, `Issued invoice for $${total.toFixed(2)}`);

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
            onChange={(e) => {
              const v = e.target.value;
              setBillingPeriod(v);
              // Keep due date pinned to the period so every invoice for the
              // same month lands on the same due date -- still editable below
              // for a genuine one-off exception.
              setDueDate(dueDateForPeriod(v));
            }}
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

              {li.source === "catalog" ? (
                <div className="flex-1 min-w-0 space-y-1">
                  <select
                    value={li.serviceKey ?? ""}
                    onChange={(e) => handleServiceSelect(i, e.target.value)}
                    className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
                  >
                    <option value="">Custom...</option>
                    {catalog.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label} — ${s.default_price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {!li.serviceKey && (
                    <input
                      value={li.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                      placeholder="Description"
                      className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
                    />
                  )}
                </div>
              ) : (
                <input
                  value={li.description}
                  onChange={(e) => updateLine(i, { description: e.target.value })}
                  placeholder="Description"
                  className="flex-1 min-w-0 border border-line bg-parchment px-2 py-1.5 text-xs"
                />
              )}

              <input
                type="number"
                step="0.01"
                min="0"
                value={li.amount}
                onChange={(e) => updateLine(i, { amount: e.target.value })}
                onBlur={(e) => {
                  const n = parseFloat(e.target.value);
                  updateLine(i, { amount: Math.max(0, isNaN(n) ? 0 : n).toFixed(2) });
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

      <div className="flex items-center gap-3">
        <button type="button" onClick={addLine} className="text-xs text-green font-medium hover:underline">
          + Add line
        </button>
        {!addingService && (
          <button
            type="button"
            onClick={() => setAddingService(true)}
            className="text-xs text-green font-medium hover:underline"
          >
            + Add new service
          </button>
        )}
      </div>

      {addingService && (
        <div className="border border-line bg-parchmentAlt p-2.5 space-y-1.5">
          {addServiceError && <p className="text-[10px] text-red">{addServiceError}</p>}
          <input
            value={newServiceLabel}
            onChange={(e) => setNewServiceLabel(e.target.value)}
            placeholder="Service name, e.g. Deep Cleaning"
            className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
          />
          <input
            value={newServicePrice}
            onChange={(e) => setNewServicePrice(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            placeholder="Default price ($)"
            className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddService}
              disabled={addServiceSaving}
              className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
            >
              {addServiceSaving ? "Adding..." : "Add Service"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingService(false);
                setNewServiceLabel("");
                setNewServicePrice("");
                setAddServiceError(null);
              }}
              className="text-xs text-ink/60 font-medium px-3 py-1.5 border border-line"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
