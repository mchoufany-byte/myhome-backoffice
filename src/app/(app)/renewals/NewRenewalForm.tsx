"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TYPES = [
  { value: "residency", label: "Residency" },
  { value: "utility", label: "Utility" },
  { value: "building_association", label: "Building Association" },
  { value: "other", label: "Other" },
];

export function NewRenewalForm({ properties }: { properties: { id: string; nickname: string | null; address: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value;
    const renewal_type = (form.elements.namedItem("renewal_type") as HTMLSelectElement).value;
    const due_date = (form.elements.namedItem("due_date") as HTMLInputElement).value || null;
    const notes = (form.elements.namedItem("notes") as HTMLTextAreaElement).value || null;

    if (!property_id || !renewal_type) {
      setError("Property and type are required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("renewals").insert({
      property_id,
      renewal_type,
      due_date,
      notes,
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
        <label className="block text-xs text-ink/60 mb-1">Type</label>
        <select name="renewal_type" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Due Date (optional)</label>
        <input name="due_date" type="date" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Notes (optional)</label>
        <textarea name="notes" rows={2} className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Logging..." : "Log Renewal"}
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
