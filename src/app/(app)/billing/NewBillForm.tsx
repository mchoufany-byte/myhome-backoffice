"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = ["electricity", "generator", "water", "building", "internet"];

export function NewBillForm({ properties }: { properties: { id: string; nickname: string | null; address: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value;
    const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
    const amountRaw = (form.elements.namedItem("amount") as HTMLInputElement).value;
    const billing_period = (form.elements.namedItem("billing_period") as HTMLInputElement).value || null;
    const fileInput = form.elements.namedItem("invoice_file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!property_id || !category || !amountRaw) {
      setError("Property, category, and amount are required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    let invoice_url: string | null = null;
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${property_id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("bill-invoices").upload(path, file);
      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }
      invoice_url = supabase.storage.from("bill-invoices").getPublicUrl(path).data.publicUrl;
    }

    const { error: insertError } = await supabase.from("bills").insert({
      property_id,
      category,
      amount: Number(amountRaw),
      billing_period,
      status: "due",
      invoice_url,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Property</label>
        <select name="property_id" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="">Select...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.address}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Category</label>
        <select name="category" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Amount ($)</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          required
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Billing Period</label>
        <input
          name="billing_period"
          placeholder="e.g. July 2026"
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Invoice / Receipt (optional)</label>
        <input name="invoice_file" type="file" className="w-full text-xs" />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Bill"}
        </button>
        <button
          type="reset"
          onClick={() => setError(null)}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
