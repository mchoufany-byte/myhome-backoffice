"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type RenewalType = { key: string; label: string; is_system: boolean };

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

function fmtDate(d: string | null) {
  if (!d) return "No due date";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function RenewalRow({
  renewal,
  staffList,
  renewalTypes,
  currentStaff,
}: {
  renewal: Renewal;
  staffList: { id: string; name: string }[];
  renewalTypes: RenewalType[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState(String(renewal.fee_amount ?? 50));

  const [editing, setEditing] = useState(false);
  const [editType, setEditType] = useState(renewal.renewal_type);
  const [editDueDate, setEditDueDate] = useState(renewal.due_date ?? "");
  const [editNotes, setEditNotes] = useState(renewal.notes ?? "");
  const [editFee, setEditFee] = useState(String(renewal.fee_amount ?? ""));
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const typeLabel = (key: string) => renewalTypes.find((t) => t.key === key)?.label ?? key;

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
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const assignedName = staffList.find((s) => s.id === assigned_staff_id)?.name;
    await logAudit(
      supabase,
      currentStaff,
      "assign",
      "renewals",
      renewal.id,
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
      .from("renewals")
      .update({ status: "completed", completed_at: new Date().toISOString(), fee_amount: Number.isFinite(n) ? n : 50 })
      .eq("id", renewal.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "complete", "renewals", renewal.id, `Marked completed, fee $${(Number.isFinite(n) ? n : 50).toFixed(2)}`);
    router.refresh();
  }

  function openEdit() {
    setEditType(renewal.renewal_type);
    setEditDueDate(renewal.due_date ?? "");
    setEditNotes(renewal.notes ?? "");
    setEditFee(String(renewal.fee_amount ?? ""));
    setEditError(null);
    setEditing(true);
  }

  async function handleSaveEdit() {
    setEditError(null);
    if (!editType) {
      setEditError("Type is required.");
      return;
    }
    const feeNum = editFee.trim() === "" ? null : parseFloat(editFee);
    if (editFee.trim() !== "" && !Number.isFinite(feeNum)) {
      setEditError("Fee must be a number.");
      return;
    }
    setEditSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("renewals")
      .update({
        renewal_type: editType,
        due_date: editDueDate || null,
        notes: editNotes.trim() || null,
        fee_amount: feeNum,
      })
      .eq("id", renewal.id);
    setEditSaving(false);
    if (updateError) {
      setEditError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "update", "renewals", renewal.id, "Edited renewal details");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink text-sm">{typeLabel(renewal.renewal_type)}</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {renewal.properties?.nickname || renewal.properties?.address}
            {renewal.properties?.clients?.name ? ` · ${renewal.properties.clients.name}` : ""} · due{" "}
            {fmtDate(renewal.due_date)}
          </p>
          {renewal.notes && !editing && <p className="text-xs text-ink/60 mt-1.5">{renewal.notes}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] px-2 py-1 border uppercase tracking-wide whitespace-nowrap ${
              renewal.status === "completed" ? "border-line text-ink/60" : overdue ? "border-red text-red" : "border-gold text-gold"
            }`}
          >
            {overdue ? "Overdue" : renewal.status === "in_progress" ? "In Progress" : renewal.status === "completed" ? "Completed" : "Pending"}
          </span>
          {!editing && (
            <button type="button" onClick={openEdit} className="text-[11px] text-green font-medium hover:underline">
              Edit
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mt-2">{error}</div>}

      {editing && (
        <div className="mt-3 border border-line bg-parchmentAlt p-3 space-y-2">
          {editError && <p className="text-[10px] text-red">{editError}</p>}
          <div>
            <label className="block text-[10px] text-ink/50 mb-1">Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            >
              {renewalTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-ink/50 mb-1">Due Date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-ink/50 mb-1">Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={editFee}
                onChange={(e) => setEditFee(e.target.value)}
                className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-ink/50 mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
            >
              {editSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-ink/60 font-medium px-3 py-1.5 border border-line"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!editing && isOpen && (
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

      {!editing && !isOpen && (
        <p className="text-xs text-ink/40 mt-2">
          {renewal.staff?.name ? `Handled by ${renewal.staff.name} · ` : ""}fee ${Number(renewal.fee_amount ?? 0).toFixed(2)}
          {renewal.fee_invoiced ? " · Invoiced" : " · Not yet invoiced"}
        </p>
      )}
    </div>
  );
}
