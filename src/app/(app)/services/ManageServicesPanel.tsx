"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type ServiceOption = { key: string; label: string; default_price: number; is_system: boolean };

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function ManageServicesPanel({
  services,
  currentStaff,
  isAdmin,
}: {
  services: ServiceOption[];
  currentStaff?: { id: string; name: string };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  function startEdit(s: ServiceOption) {
    setEditingKey(s.key);
    setEditLabel(s.label);
    setEditPrice(String(s.default_price));
    setEditError(null);
  }

  async function saveEdit(key: string) {
    setEditError(null);
    const label = editLabel.trim();
    const price = parseFloat(editPrice);
    if (!label) {
      setEditError("Name is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setEditError("Price must be a number of 0 or more.");
      return;
    }
    setEditSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("services")
      .update({ label, default_price: price })
      .eq("key", key);
    setEditSaving(false);
    if (updateError) {
      setEditError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "update", "services", key, `Updated ${label} to $${price.toFixed(2)}`);
    setEditingKey(null);
    router.refresh();
  }

  async function handleAdd() {
    setAddError(null);
    const label = newLabel.trim();
    const price = parseFloat(newPrice);
    if (!label) {
      setAddError("Enter a name for the new service.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setAddError("Price must be a number of 0 or more.");
      return;
    }
    const key = slugify(label);
    if (!key) {
      setAddError("That name can't be turned into a valid service key.");
      return;
    }
    if (services.some((s) => s.key === key)) {
      setAddError("A service with that name already exists.");
      return;
    }
    setAddSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("services")
      .insert({ key, label, default_price: price, is_system: false });
    setAddSaving(false);
    if (insertError) {
      setAddError(insertError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "create", "services", key, `Created service ${label}`);
    setNewLabel("");
    setNewPrice("");
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="bg-surface border border-line p-4">
      <div className="divide-y divide-line">
        {services.map((s) => (
          <div key={s.key} className="py-2.5">
            {editingKey === s.key ? (
              <div className="space-y-1.5">
                {editError && <p className="text-[10px] text-red">{editError}</p>}
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
                />
                <input
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(s.key)}
                    disabled={editSaving}
                    className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
                  >
                    {editSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingKey(null)}
                    className="text-xs text-ink/60 font-medium px-3 py-1.5 border border-line"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-ink">{s.label}</p>
                  <p className="text-xs text-ink/50 mt-0.5">${Number(s.default_price).toFixed(2)}</p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="text-[11px] text-green font-medium hover:underline shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {!services.length && <p className="py-2.5 text-sm text-ink/50">No services yet.</p>}
      </div>

      {!isAdmin && (
        <p className="text-[10.5px] text-ink/40 mt-3">Only admins can add services or change pricing.</p>
      )}

      {isAdmin && (!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[11px] text-green font-medium hover:underline mt-3"
        >
          + Add new service
        </button>
      ) : (
        <div className="mt-3 border border-line bg-parchmentAlt p-2.5 space-y-1.5">
          {addError && <p className="text-[10px] text-red">{addError}</p>}
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Deep Balcony Clean"
            className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
          />
          <input
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            placeholder="Price ($)"
            className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={addSaving}
              className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
            >
              {addSaving ? "Adding..." : "Add Service"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewLabel("");
                setNewPrice("");
                setAddError(null);
              }}
              className="text-xs text-ink/60 font-medium px-3 py-1.5 border border-line"
            >
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
