"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TYPES = [
  { value: "morning_visit", label: "Morning Visit" },
  { value: "cleaning", label: "Scheduled Cleaning" },
  { value: "inspection", label: "Inspection" },
  { value: "pre_arrival", label: "Pre-Arrival Deep Clean" },
];

export function NewVisitForm({
  properties,
  staffList,
}: {
  properties: { id: string; nickname: string | null; address: string }[];
  staffList: { id: string; name: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value;
    const type = (form.elements.namedItem("type") as HTMLSelectElement).value;
    const staff_id = (form.elements.namedItem("staff_id") as HTMLSelectElement).value || null;
    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const time = (form.elements.namedItem("time") as HTMLInputElement).value;

    if (!property_id || !type || !date) {
      setError("Property, type, and date are required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const scheduled_at = time ? new Date(`${date}T${time}`).toISOString() : new Date(`${date}T09:00`).toISOString();

    const { error: insertError } = await supabase.from("visits").insert({
      property_id,
      type,
      staff_id,
      scheduled_at,
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
        <select name="type" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Assign To</label>
        <select name="staff_id" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="">Unassigned</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Date</label>
          <input name="date" type="date" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Time</label>
          <input name="time" type="time" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Scheduling..." : "Schedule"}
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
