"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type Supplier = {
  key: string;
  name: string;
  category: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
};

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function SuppliersPanel({
  suppliers,
  currentStaff,
}: {
  suppliers: Supplier[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setError(null);
    const label = name.trim();
    if (!label) {
      setError("Enter a supplier name.");
      return;
    }
    const key = slugify(label);
    if (!key) {
      setError("That name can't be turned into a valid key.");
      return;
    }
    if (suppliers.some((s) => s.key === key)) {
      setError("A supplier with that name already exists.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("building_suppliers").insert({
      key,
      name: label,
      category: category.trim() || null,
      contact_phone: phone.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "create", "building_suppliers", key, `Added supplier ${label}`);
    setName("");
    setCategory("");
    setPhone("");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="bg-surface border border-line p-4">
      <div className="divide-y divide-line">
        {suppliers.map((s) => (
          <div key={s.key} className="py-2">
            <p className="text-sm text-ink">{s.name}</p>
            <p className="text-xs text-ink/50 mt-0.5">
              {s.category ?? "—"}
              {s.contact_phone ? ` · ${s.contact_phone}` : ""}
            </p>
          </div>
        ))}
        {!suppliers.length && <p className="py-2 text-sm text-ink/50">No suppliers yet.</p>}
      </div>

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[11px] text-green font-medium hover:underline mt-3"
        >
          + Add new supplier
        </button>
      ) : (
        <div className="mt-3 border border-line bg-parchmentAlt p-2.5 space-y-1.5">
          {error && <p className="text-[10px] text-red">{error}</p>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Supplier name"
            className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g. Generator fuel)"
            className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add Supplier"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="text-xs text-ink/60 font-medium px-3 py-1.5 border border-line"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
