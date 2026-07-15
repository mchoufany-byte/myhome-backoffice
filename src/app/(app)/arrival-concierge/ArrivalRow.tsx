"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type Arrival = {
  id: string;
  arrival_date: string | null;
  arrival_time: string | null;
  airport_pickup: boolean | null;
  flowers: boolean | null;
  groceries: boolean | null;
  temperature_pref: number | null;
  lights_at_dusk: boolean | null;
  linen_cleaning: boolean | null;
  notes: string | null;
  status: string;
  assigned_staff_id: string | null;
  fee_amount: number | null;
  fee_invoiced: boolean;
  completed_at: string | null;
  properties?: { nickname: string | null; address: string; clients?: { name: string } | null } | null;
  staff?: { name: string } | null;
};

function fmtDate(d: string | null) {
  if (!d) return "No date given";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function checklistTags(a: Arrival) {
  const tags: string[] = [];
  if (a.airport_pickup) tags.push("Airport pickup");
  if (a.flowers) tags.push("Flowers");
  if (a.groceries) tags.push("Groceries");
  if (a.temperature_pref != null) tags.push(`Temp ${a.temperature_pref}°`);
  if (a.lights_at_dusk) tags.push("Lights at dusk");
  if (a.linen_cleaning) tags.push("Linen cleaning");
  return tags;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export function ArrivalRow({
  arrival,
  staffList,
  currentStaff,
}: {
  arrival: Arrival;
  staffList: { id: string; name: string }[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState(String(arrival.fee_amount ?? 30));

  const isOpen = arrival.status !== "completed";

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const assigned_staff_id = (e.currentTarget.elements.namedItem("assigned_staff_id") as HTMLSelectElement).value || null;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("arrival_requests")
      .update({ assigned_staff_id, status: "in_progress" })
      .eq("id", arrival.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const assignedName = staffList.find((s) => s.id === assigned_staff_id)?.name;
    await logAudit(
      supabase,
      currentStaff,
      "assign",
      "arrival_requests",
      arrival.id,
      assignedName ? `Assigned to ${assignedName}` : "Unassigned"
    );
    router.refresh();
  }

  async function handleComplete() {
    setError(null);
    const n = parseFloat(fee);
    if (fee.trim() !== "" && (!Number.isFinite(n) || n < 0)) {
      setError("Fee must be a number of 0 or more.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("arrival_requests")
      .update({ status: "completed", completed_at: new Date().toISOString(), fee_amount: Number.isFinite(n) ? n : 30 })
      .eq("id", arrival.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "complete", "arrival_requests", arrival.id, `Marked completed, fee $${(Number.isFinite(n) ? n : 30).toFixed(2)}`);
    router.refresh();
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink text-sm">
            {arrival.properties?.nickname || arrival.properties?.address}
            {arrival.properties?.clients?.name ? ` · ${arrival.properties.clients.name}` : ""}
          </p>
          <p className="text-xs text-ink/50 mt-0.5">
            Arriving {fmtDate(arrival.arrival_date)}
            {arrival.arrival_time ? ` at ${arrival.arrival_time}` : ""}
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {checklistTags(arrival).map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-surfaceAlt text-ink/70 border border-line">
                {t}
              </span>
            ))}
          </div>
          {arrival.notes && <p className="text-xs text-ink/60 mt-1.5">{arrival.notes}</p>}
        </div>
        <span
          className={`text-[10px] px-2 py-1 border uppercase tracking-wide whitespace-nowrap shrink-0 ${
            arrival.status === "completed" ? "border-line text-ink/60" : "border-gold text-gold"
          }`}
        >
          {STATUS_LABEL[arrival.status] ?? arrival.status}
        </span>
      </div>

      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mt-2">{error}</div>}

      {isOpen && (
        <div className="mt-3 space-y-2">
          <form onSubmit={handleAssign} className="flex items-center gap-2">
            <select
              name="assigned_staff_id"
              defaultValue={arrival.assigned_staff_id ?? ""}
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
                min="0"
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
          {arrival.staff?.name ? `Handled by ${arrival.staff.name} · ` : ""}fee ${Number(arrival.fee_amount ?? 0).toFixed(2)}
          {arrival.fee_invoiced ? " · Invoiced" : " · Not yet invoiced"}
        </p>
      )}
    </div>
  );
}
