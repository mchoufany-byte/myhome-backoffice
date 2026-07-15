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
  const [serviceKey, setServiceKey] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientProperties = useMemo(() => properties.filter((p) => p.client_id === clientId), [properties, clientId]);

  function handleServiceChange(key: string) {
    setServiceKey(key);
    const svc = services.find((s) => s.key === key);
    if (svc) {
      setDescription(svc.label);
      setPrice(svc.default_price.toFixed(2));
    } else {
      setDescription("");
      setPrice("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value || null;
    const quantityRaw = (form.elements.namedItem("quantity") as HTMLInputElement).value;
    const notes = (form.elements.namedItem("notes") as HTMLTextAreaElement).value || null;

    if (!clientId) {
      setError("Select a client.");
      return;
    }
    if (!description.trim()) {
      setError("Pick a service, or type a custom description.");
      return;
    }
    const priceNum = parseFloat(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Price must be a number of 0 or more.");
      return;
    }
    const quantity = quantityRaw ? parseInt(quantityRaw, 10) : 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantity must be a whole number of 1 or more.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("service_orders").insert({
      client_id: clientId,
      property_id,
      service_key: serviceKey || null,
      description: description.trim(),
      price: priceNum,
      quantity,
      status: "pending",
      notes,
      created_by: currentStaff?.id ?? null,
    });

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
      `Ordered ${description.trim()} for $${(priceNum * quantity).toFixed(2)}`
    );

    formRef.current?.reset();
    setClientId("");
    setServiceKey("");
    setDescription("");
    setPrice("");
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Client</label>
        <select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
          }}
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
        <label className="block text-xs text-ink/60 mb-1">Service</label>
        <select
          value={serviceKey}
          onChange={(e) => handleServiceChange(e.target.value)}
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        >
          <option value="">Custom...</option>
          {services.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} — ${s.default_price.toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {!serviceKey && (
        <div>
          <label className="block text-xs text-ink/60 mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. One-off extra cleaning"
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Price ($)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => setPrice((v) => (Number.isFinite(parseFloat(v)) ? Math.max(0, parseFloat(v)).toFixed(2) : ""))}
            type="number"
            step="0.01"
            min="0"
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Quantity</label>
          <input
            name="quantity"
            type="number"
            step="1"
            min="1"
            defaultValue="1"
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
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
            setServiceKey("");
            setDescription("");
            setPrice("");
          }}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
