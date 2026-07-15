"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type ClientOption = { id: string; name: string; client_type: string | null; company_name: string | null };
type PropertyOption = { id: string; client_id: string; nickname: string | null; address: string };
type ServiceOption = { key: string; label: string; default_price: number };

function clientLabel(c: ClientOption) {
  return c.client_type === "company" && c.company_name ? c.company_name : c.name;
}

export function NewServiceOrderForm({
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
  // Checklist selection: service key -> quantity. Prices are locked to the
  // catalog price (not editable here) -- only admins can change what a
  // service costs, from the Manage Services panel.
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientProperties = useMemo(() => properties.filter((p) => p.client_id === clientId), [properties, clientId]);

  function toggleService(key: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (key in next) delete next[key];
      else next[key] = 1;
      return next;
    });
  }

  function setQty(key: string, qty: string) {
    const n = parseInt(qty, 10);
    setSelected((prev) => ({ ...prev, [key]: Number.isFinite(n) && n >= 1 ? n : 1 }));
  }

  const checklistTotal = services.reduce((sum, s) => sum + (selected[s.key] ? s.default_price * selected[s.key] : 0), 0);
  const customTotal = customEnabled && Number.isFinite(parseFloat(customPrice))
    ? parseFloat(customPrice) * (parseInt(customQty, 10) || 1)
    : 0;
  const grandTotal = checklistTotal + customTotal;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value || null;
    const notes = (form.elements.namedItem("notes") as HTMLTextAreaElement).value || null;

    if (!clientId) {
      setError("Select a client.");
      return;
    }

    const rows: Record<string, unknown>[] = Object.entries(selected).map(([key, qty]) => {
      const svc = services.find((s) => s.key === key)!;
      return {
        client_id: clientId,
        property_id,
        service_key: key,
        description: svc.label,
        price: svc.default_price,
        quantity: qty,
        status: "pending",
        notes,
        created_by: currentStaff?.id ?? null,
      };
    });

    if (customEnabled) {
      const desc = customDesc.trim();
      const price = parseFloat(customPrice);
      const qty = parseInt(customQty, 10) || 1;
      if (!desc) {
        setError("Enter a description for the custom item, or uncheck it.");
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        setError("Custom item price must be a number of 0 or more.");
        return;
      }
      rows.push({
        client_id: clientId,
        property_id,
        service_key: null,
        description: desc,
        price,
        quantity: qty,
        status: "pending",
        notes,
        created_by: currentStaff?.id ?? null,
      });
    }

    if (!rows.length) {
      setError("Check at least one service, or add a custom item.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("service_orders").insert(rows);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    await logAudit(
      supabase,
      currentStaff,
      "create",
      "service_orders",
      null,
      `Ordered ${rows.length} service${rows.length === 1 ? "" : "s"} totaling $${grandTotal.toFixed(2)}`
    );

    formRef.current?.reset();
    setClientId("");
    setSelected({});
    setCustomEnabled(false);
    setCustomDesc("");
    setCustomPrice("");
    setCustomQty("1");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Client</label>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        >
          <option value="">Select...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {clientLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-ink/60 mb-1">Property (optional)</label>
        <select name="property_id" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="">Not property-specific</option>
          {clientProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.address}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-ink/60 mb-1.5">Services</label>
        <div className="border border-line divide-y divide-line">
          {services.map((s) => {
            const checked = s.key in selected;
            return (
              <div key={s.key} className="flex items-center justify-between gap-2 px-2.5 py-2">
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer min-w-0 flex-1">
                  <input type="checkbox" checked={checked} onChange={() => toggleService(s.key)} />
                  <span className="truncate">{s.label}</span>
                </label>
                <span className="text-xs text-ink/50 shrink-0">${s.default_price.toFixed(2)}</span>
                {checked && (
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={selected[s.key]}
                    onChange={(e) => setQty(s.key, e.target.value)}
                    aria-label={`Quantity for ${s.label}`}
                    className="w-12 border border-line bg-parchment px-1.5 py-1 text-xs shrink-0"
                  />
                )}
              </div>
            );
          })}
          {!services.length && <p className="px-2.5 py-2 text-sm text-ink/50">No services in the catalog yet.</p>}
        </div>
      </div>

      <div className="border border-line px-2.5 py-2">
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={customEnabled} onChange={() => setCustomEnabled((v) => !v)} />
          Custom (one-off) item
        </label>
        {customEnabled && (
          <div className="mt-2 space-y-1.5">
            <input
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              placeholder="Description"
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                placeholder="Price ($)"
                className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
              />
              <input
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                type="number"
                min="1"
                step="1"
                placeholder="Qty"
                className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-ink/60 mb-1">Notes (optional)</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          placeholder="Anything staff fulfilling this should know"
        />
      </div>

      <p className="text-xs text-ink/60">Total: ${grandTotal.toFixed(2)}</p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Log Order"}
        </button>
        <button
          type="reset"
          onClick={() => {
            setError(null);
            setClientId("");
            setSelected({});
            setCustomEnabled(false);
            setCustomDesc("");
            setCustomPrice("");
            setCustomQty("1");
          }}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
