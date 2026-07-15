"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type BillCategory = { key: string; label: string; is_system: boolean };

function slugify(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function NewBillForm({
  properties,
  categories,
  currentStaff,
}: {
  properties: { id: string; nickname: string | null; address: string }[];
  categories: BillCategory[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cats, setCats] = useState<BillCategory[]>(categories);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.label ?? "");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);
  const [addCategorySaving, setAddCategorySaving] = useState(false);

  async function handleAddCategory() {
    const label = newCategoryLabel.trim();
    if (!label) {
      setAddCategoryError("Enter a name for the new category.");
      return;
    }
    const key = slugify(label);
    if (!key) {
      setAddCategoryError("That name can't be turned into a valid category.");
      return;
    }
    if (cats.some((c) => c.key === key)) {
      setAddCategoryError("A category with that name already exists.");
      return;
    }
    setAddCategorySaving(true);
    setAddCategoryError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("bill_categories").insert({ key, label, is_system: false });
    setAddCategorySaving(false);
    if (insertError) {
      setAddCategoryError(insertError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "create", "bill_categories", key, `Created category ${label}`);

    const nextCats = [...cats, { key, label, is_system: false }].sort((a, b) => a.label.localeCompare(b.label));
    setCats(nextCats);
    setSelectedCategory(label);
    setNewCategoryLabel("");
    setAddingCategory(false);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value;
    const category = selectedCategory;
    const amountRaw = (form.elements.namedItem("amount") as HTMLInputElement).value;
    const billing_period = (form.elements.namedItem("billing_period") as HTMLInputElement).value || null;
    const fileInput = form.elements.namedItem("invoice_file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!property_id || !category || !amountRaw) {
      setError("Property, category, and amount are required.");
      return;
    }
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Amount must be a number of 0 or more.");
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
      amount,
      billing_period,
      status: "due",
      invoice_url,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    await logAudit(supabase, currentStaff, "create", "bills", null, `Created ${category} bill for $${amount.toFixed(2)}`);

    formRef.current?.reset();
    setSelectedCategory(categories[0]?.label ?? "");
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
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          required
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        >
          {cats.map((c) => (
            <option key={c.key} value={c.label}>
              {c.label}
            </option>
          ))}
        </select>

        {!addingCategory ? (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            className="text-[11px] text-green font-medium hover:underline mt-1"
          >
            + Add new category
          </button>
        ) : (
          <div className="mt-2 border border-line bg-parchmentAlt p-2.5 space-y-1.5">
            {addCategoryError && <p className="text-[10px] text-red">{addCategoryError}</p>}
            <input
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              placeholder="e.g. Cable TV"
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={addCategorySaving}
                className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
              >
                {addCategorySaving ? "Adding..." : "Add Category"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingCategory(false);
                  setNewCategoryLabel("");
                  setAddCategoryError(null);
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
        <label className="block text-xs text-ink/60 mb-1">Amount ($)</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
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
          onClick={() => {
            setError(null);
            setSelectedCategory(categories[0]?.label ?? "");
          }}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
