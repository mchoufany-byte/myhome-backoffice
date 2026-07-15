"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type RenewalType = { key: string; label: string; is_system: boolean };

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function NewRenewalForm({
  properties,
  renewalTypes,
  currentStaff,
}: {
  properties: { id: string; nickname: string | null; address: string }[];
  renewalTypes: RenewalType[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<RenewalType[]>(renewalTypes);
  const [selectedType, setSelectedType] = useState(renewalTypes[0]?.key ?? "");
  const [addingType, setAddingType] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [addTypeError, setAddTypeError] = useState<string | null>(null);
  const [addingSaving, setAddingSaving] = useState(false);

  async function handleAddType() {
    const label = newTypeLabel.trim();
    if (!label) {
      setAddTypeError("Enter a name for the new type.");
      return;
    }
    const key = slugify(label);
    if (!key) {
      setAddTypeError("That name can't be turned into a valid type.");
      return;
    }
    if (types.some((t) => t.key === key)) {
      setAddTypeError("A type with that name already exists.");
      return;
    }
    setAddingSaving(true);
    setAddTypeError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("renewal_types").insert({ key, label, is_system: false });
    setAddingSaving(false);
    if (insertError) {
      setAddTypeError(insertError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "create", "renewal_types", null, `Added renewal type "${label}"`);
    const nextTypes = [...types, { key, label, is_system: false }].sort((a, b) => a.label.localeCompare(b.label));
    setTypes(nextTypes);
    setSelectedType(key);
    setNewTypeLabel("");
    setAddingType(false);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value;
    const renewal_type = selectedType;
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
    const typeLabel = types.find((t) => t.key === renewal_type)?.label ?? renewal_type;
    await logAudit(supabase, currentStaff, "create", "renewals", null, `Logged ${typeLabel} renewal`);
    formRef.current?.reset();
    setSelectedType(renewalTypes[0]?.key ?? "");
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
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          required
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        >
          {types.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>

        {!addingType ? (
          <button
            type="button"
            onClick={() => setAddingType(true)}
            className="text-[11px] text-green font-medium hover:underline mt-1"
          >
            + Add new type
          </button>
        ) : (
          <div className="mt-2 border border-line bg-parchmentAlt p-2.5 space-y-1.5">
            {addTypeError && <p className="text-[10px] text-red">{addTypeError}</p>}
            <input
              value={newTypeLabel}
              onChange={(e) => setNewTypeLabel(e.target.value)}
              placeholder="e.g. Work Permit"
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddType}
                disabled={addingSaving}
                className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
              >
                {addingSaving ? "Adding..." : "Add Type"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingType(false);
                  setNewTypeLabel("");
                  setAddTypeError(null);
                }}
                className="text-xs text-ink/60 font-medium px-3 py-1.5 border border-line"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
          onClick={() => {
            setError(null);
            setSelectedType(renewalTypes[0]?.key ?? "");
          }}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
