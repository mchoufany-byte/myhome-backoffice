"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type Supplier = { key: string; name: string; category: string | null };
type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  building_suppliers?: { name: string } | null;
};

const CATEGORIES = [
  { value: "generator", label: "Generator" },
  { value: "fuel", label: "Fuel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ExpensesPanel({
  buildingId,
  expenses,
  suppliers,
  currentStaff,
}: {
  buildingId: string;
  expenses: Expense[];
  suppliers: Supplier[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [category, setCategory] = useState("generator");
  const [supplierKey, setSupplierKey] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [addingSupplier, setAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [localSuppliers, setLocalSuppliers] = useState(suppliers);

  async function handleAddSupplier() {
    const name = newSupplierName.trim();
    if (!name) return;
    const key = slugify(name);
    if (!key || localSuppliers.some((s) => s.key === key)) return;
    const supabase = createClient();
    const { error: insertError } = await supabase.from("building_suppliers").insert({ key, name });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "create", "building_suppliers", key, `Added supplier ${name}`);
    setLocalSuppliers((prev) => [...prev, { key, name, category: null }].sort((a, b) => a.name.localeCompare(b.name)));
    setSupplierKey(key);
    setNewSupplierName("");
    setAddingSupplier(false);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Amount must be a number of 0 or more.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("building_expenses").insert({
      building_id: buildingId,
      category,
      supplier_key: supplierKey || null,
      description: description.trim() || null,
      amount: amt,
      expense_date: date,
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
      "building_expenses",
      null,
      `Logged ${category} expense of $${amt.toFixed(2)}`
    );
    setDescription("");
    setAmount("");
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3 mb-4">
        {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ink/60 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">Date</label>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              required
              className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink/60 mb-1">Supplier</label>
          <select
            value={supplierKey}
            onChange={(e) => setSupplierKey(e.target.value)}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          >
            <option value="">Not specified</option>
            {localSuppliers.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
          {!addingSupplier ? (
            <button
              type="button"
              onClick={() => setAddingSupplier(true)}
              className="text-[11px] text-green font-medium hover:underline mt-1"
            >
              + Add new supplier
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Supplier name"
                className="flex-1 border border-line bg-parchment px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleAddSupplier}
                className="text-xs bg-green text-parchment font-medium px-3 py-1.5"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingSupplier(false)}
                className="text-xs text-ink/60 font-medium px-3 py-1.5 border border-line"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-ink/60 mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Diesel refill, 200L"
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-ink/60 mb-1">Amount ($)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            required
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Logging..." : "Log Expense"}
        </button>
      </form>

      <div className="bg-surface border border-line divide-y divide-line">
        {expenses.slice(0, 20).map((e) => (
          <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-ink capitalize">{e.category}</p>
              <p className="text-xs text-ink/50 mt-0.5 truncate">
                {e.building_suppliers?.name ?? "No supplier"}
                {e.description ? ` · ${e.description}` : ""} · {shortDate(e.expense_date)}
              </p>
            </div>
            <p className="text-sm text-ink/70 shrink-0">${Number(e.amount).toFixed(2)}</p>
          </div>
        ))}
        {!expenses.length && <p className="px-4 py-6 text-sm text-ink/50">No expenses logged yet.</p>}
      </div>
    </div>
  );
}
