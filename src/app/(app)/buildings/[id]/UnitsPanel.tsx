"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type Unit = {
  id: string;
  unit_label: string;
  owner_name: string | null;
  contact_phone: string | null;
  common_charge_amount: number;
  is_active: boolean;
};

export function UnitsPanel({
  buildingId,
  units,
  currentStaff,
}: {
  buildingId: string;
  units: Unit[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [charge, setCharge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setError(null);
    const unit_label = label.trim();
    if (!unit_label) {
      setError("Enter a flat/unit label, e.g. 'Flat 3B'.");
      return;
    }
    const amount = parseFloat(charge);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Common charge must be a number of 0 or more.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("building_units").insert({
      building_id: buildingId,
      unit_label,
      owner_name: owner.trim() || null,
      contact_phone: phone.trim() || null,
      common_charge_amount: amount,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "create", "building_units", null, `Added unit ${unit_label}`);
    setLabel("");
    setOwner("");
    setPhone("");
    setCharge("");
    setAdding(false);
    router.refresh();
  }

  async function toggleActive(unit: Unit) {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("building_units")
      .update({ is_active: !unit.is_active })
      .eq("id", unit.id);
    if (updateError) return;
    await logAudit(
      supabase,
      currentStaff,
      "update",
      "building_units",
      unit.id,
      unit.is_active ? `Deactivated ${unit.unit_label}` : `Reactivated ${unit.unit_label}`
    );
    router.refresh();
  }

  return (
    <div className="bg-surface border border-line">
      <div className="divide-y divide-line">
        {units.map((u) => (
          <div key={u.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm ${u.is_active ? "text-ink" : "text-ink/40 line-through"}`}>{u.unit_label}</p>
              <p className="text-xs text-ink/50 mt-0.5">
                {u.owner_name ?? "No owner on file"}
                {u.contact_phone ? ` · ${u.contact_phone}` : ""} · ${Number(u.common_charge_amount).toFixed(2)}/mo
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleActive(u)}
              className="text-[11px] text-ink/50 font-medium hover:underline shrink-0"
            >
              {u.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        ))}
        {!units.length && <p className="px-4 py-4 text-sm text-ink/50">No flats added yet.</p>}
      </div>

      <div className="px-4 py-3 border-t border-line">
        {!adding ? (
          <button type="button" onClick={() => setAdding(true)} className="text-[11px] text-green font-medium hover:underline">
            + Add flat
          </button>
        ) : (
          <div className="space-y-1.5">
            {error && <p className="text-[10px] text-red">{error}</p>}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Flat / unit label, e.g. Flat 3B"
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner/tenant name (optional)"
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contact phone (optional)"
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
            <input
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="Common charge ($/month)"
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add Flat"}
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
    </div>
  );
}
