"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Renewal = {
  id: string;
  renewal_type: string;
  status: string;
  due_date: string | null;
  assigned_staff_id: string | null;
  fee_amount: number | null;
  fee_invoiced: boolean;
  notes: string | null;
  completed_at: string | null;
  properties?: { nickname: string | null; address: string; clients?: { name: string } | null } | null;
  staff?: { name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  residency: "Residency",
  utility: "Utility",
  building_association: "Building Association",
  other: "Other",
};

function fmtDate(d: string | null) {
  if (!d) return "No due date";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function RenewalRow({ renewal, staffList }: { renewal: Renewal; staffList: { id: string; name: string }[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState(String(renewal.fee_amount ?? 50));

  const isOpen = renewal.status !== "completed";
  const overdue = isOpen && renewal.due_date && new Date(renewal.due_date) < new Date();

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const assigned_staff_id = (e.currentTarget.elements.namedItem("assigned_staff_id") as HTMLSelectElement).value || null;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("renewals")
      .update({ assigned_staff_id, status: "in_progress" })
      .eq("id", renewal.id);
    if (updateError) setError(updateError.message);
    else router.refresh();
  }

  async function handleComplete() {
    setError(null);
    const n = parseFloat(fee);
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("renewals")
      .update({ status: "completed", completed_at: new Date().toISOString(), fee_amount: Number.isFinite(n) ? n : 50 })
      .eq("id", renewal.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink text-sm">{TYPE_LABEL[renewal.renewal_type] ?? renewal.renewal_type}</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {renewal.properties?.nickname || renewal.properties?.address}
            {renewal.properties?.clients?.name ? ` · ${renewal.properties.clients.name}` : ""} · due{" "}
            {fmtDate(renewal.due_date)}
          </p>
          {renewal.notes && <p className="text-xs text-ink/60 mt-1.5">{renewal.notes}</p>}
        </div>
        <span
          className={`text-[10px] px-2 py-1 border uppercase tracking-wide whitespace-nowrap shrink-0 ${
            renewal.status === "completed" ? "border-line text-ink/60" : overdue ? "border-red text-red" : "border-gold text-gold"
          }`}
        >
          {overdue ? "Overdue" : renewal.status === "in_progress" ? "In Progress" : renewal.status === "completed" ? "Completed" : "Pending"}
        </span>
      </div>

      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mt-2">{error}</div>}

      {isOpen && (
        <div className="mt-3 space-y-2">
          <form onSubmit={handleAssign} className="flex items-center gap-2">
            <select
              name="assigned_staff_id"
              defaultValue={renewal.assigned_staff_id ?? ""}
              className="border border-line bg-parchment text-xs px-2 py-1.5"
            >
              <option value="">Unassigned</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className="text-xs text-green font-medium hover:underline">
              Assign
            </button>
          </form>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[10px] text-ink/50 mb-1">Fee ($)</label>
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                type="number"
                step="0.01"
                className="w-20 border border-line bg-parchment text-xs px-2 py-1.5"
              />
            </div>
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Mark Completed"}
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <p className="text-xs text-ink/40 mt-2">
          {renewal.staff?.name ? `Handled by ${renewal.staff.name} · ` : ""}fee ${Number(renewal.fee_amount ?? 0).toFixed(2)}
          {renewal.fee_invoiced ? " · Invoiced" : " · Not yet invoiced"}
        </p>
      )}
    </div>
  );
}
