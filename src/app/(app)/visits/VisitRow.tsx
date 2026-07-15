"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type Visit = {
  id: string;
  type: string | null;
  scheduled_at: string | null;
  checked_in_at: string | null;
  checked_out_at?: string | null;
  staff_id: string | null;
  second_staff_id?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  inspection_checklist?: Record<string, string> | null;
  reschedule_reason: string | null;
  properties?: { nickname: string | null; address: string } | null;
  staff?: { name: string } | null;
  second_staff?: { name: string } | null;
};

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "water", label: "Water / plumbing" },
  { key: "hvac", label: "AC / heating" },
  { key: "electrical", label: "Electrical" },
  { key: "doors_windows_seals", label: "Doors, windows & seals" },
  { key: "mailbox_mail", label: "Mailbox / mail" },
  { key: "pest_signs", label: "Signs of pests" },
  { key: "generator_autostart", label: "Generator auto-start" },
  { key: "mold_leak_signs", label: "Signs of mold or leaks" },
];

function typeLabel(type: string | null, TYPES: { value: string; label: string }[]) {
  return TYPES.find((t) => t.value === type)?.label ?? type ?? "Visit";
}

function fmt(iso: string | null) {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function VisitRow({
  visit,
  staffList,
  TYPES,
  completed = false,
  currentStaff,
}: {
  visit: Visit;
  staffList: { id: string; name: string }[];
  TYPES: { value: string; label: string }[];
  completed?: boolean;
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, string>>(visit.inspection_checklist ?? {});
  const isInspection = visit.type === "inspection";

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const staff_id = (e.currentTarget.elements.namedItem("staff_id") as HTMLSelectElement).value || null;
    const second_staff_id = (e.currentTarget.elements.namedItem("second_staff_id") as HTMLSelectElement).value || null;
    if (second_staff_id && second_staff_id === staff_id) {
      setError("The second staff member must be different from the first.");
      return;
    }
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("visits")
      .update({ staff_id, second_staff_id })
      .eq("id", visit.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "assign", "visits", visit.id, "Assigned staff to visit");
    router.refresh();
  }

  async function handleReschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const date = (e.currentTarget.elements.namedItem("date") as HTMLInputElement).value;
    const time = (e.currentTarget.elements.namedItem("time") as HTMLInputElement).value || "09:00";
    const reason = (e.currentTarget.elements.namedItem("reschedule_reason") as HTMLTextAreaElement).value || null;
    if (!date) {
      setError("Pick a date.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const scheduled_at = new Date(`${date}T${time}`).toISOString();
    const { error: updateError } = await supabase
      .from("visits")
      .update({ scheduled_at, reschedule_reason: reason })
      .eq("id", visit.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "reschedule", "visits", visit.id, reason ? `Rescheduled: ${reason}` : "Rescheduled");
    setRescheduling(false);
    router.refresh();
  }

  async function handleCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const reason = (e.currentTarget.elements.namedItem("reason") as HTMLTextAreaElement).value || null;
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("visits")
      .update({ cancelled_at: new Date().toISOString(), cancel_reason: reason })
      .eq("id", visit.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "cancel", "visits", visit.id, reason ? `Cancelled: ${reason}` : "Cancelled");
    setCancelling(false);
    router.refresh();
  }

  async function handleSaveNotes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const notes = (e.currentTarget.elements.namedItem("notes") as HTMLTextAreaElement).value || null;
    const recommendations = (e.currentTarget.elements.namedItem("recommendations") as HTMLTextAreaElement).value || null;
    setSaving(true);
    const supabase = createClient();
    const patch: Record<string, unknown> = { notes, recommendations };
    if (isInspection) patch.inspection_checklist = checklist;
    const { error: updateError } = await supabase.from("visits").update(patch).eq("id", visit.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "update_notes", "visits", visit.id, "Updated visit notes");
    setEditingNotes(false);
    router.refresh();
  }

  const staffLine = [visit.staff?.name, visit.second_staff?.name].filter(Boolean).join(" & ") || "No staff logged";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">{typeLabel(visit.type, TYPES)}</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {visit.properties?.nickname || visit.properties?.address} ·{" "}
            {completed ? fmt(visit.checked_out_at ?? null) : fmt(visit.scheduled_at)}
            {!completed && visit.checked_in_at ? " · Checked in" : ""}
            {completed ? ` · ${staffLine}` : ""}
          </p>
          {visit.reschedule_reason && (
            <p className="text-xs text-gold/80 mt-0.5">Rescheduled: {visit.reschedule_reason}</p>
          )}
        </div>
        {!completed && (
          <form onSubmit={handleAssign} className="flex items-center gap-1.5 shrink-0">
            <select
              name="staff_id"
              defaultValue={visit.staff_id ?? ""}
              className="border border-line bg-parchment text-xs px-2 py-1.5"
            >
              <option value="">Unassigned</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink/40">+</span>
            <select
              name="second_staff_id"
              defaultValue={visit.second_staff_id ?? ""}
              className="border border-line bg-parchment text-xs px-2 py-1.5"
              title="Second staff member (two-person visit policy)"
            >
              <option value="">2nd (none)</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className="text-xs text-green font-medium hover:underline whitespace-nowrap">
              Save
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2">
        {!completed && (
          <>
            <button
              onClick={() => {
                setRescheduling((v) => !v);
                setCancelling(false);
                setEditingNotes(false);
              }}
              className="text-xs text-ink/60 font-medium hover:underline"
            >
              {rescheduling ? "Close" : "Reschedule"}
            </button>
            <button
              onClick={() => {
                setCancelling((v) => !v);
                setRescheduling(false);
                setEditingNotes(false);
              }}
              className="text-xs text-red font-medium hover:underline"
            >
              {cancelling ? "Close" : "Cancel Visit"}
            </button>
          </>
        )}
        <button
          onClick={() => {
            setEditingNotes((v) => !v);
            setRescheduling(false);
            setCancelling(false);
          }}
          className="text-xs text-ink/60 font-medium hover:underline"
        >
          {editingNotes ? "Close" : visit.notes || visit.recommendations ? "Edit Notes" : "Add Notes"}
        </button>
      </div>

      {!editingNotes && (visit.notes || visit.recommendations || (isInspection && visit.inspection_checklist)) && (
        <div className="mt-2 text-xs text-ink/70 space-y-1">
          {visit.notes && <p>{visit.notes}</p>}
          {visit.recommendations && <p className="text-gold/90">Recommendation: {visit.recommendations}</p>}
          {isInspection && visit.inspection_checklist && (
            <div className="flex flex-wrap gap-1 pt-1">
              {CHECKLIST_ITEMS.map((item) => {
                const v = visit.inspection_checklist?.[item.key];
                if (!v) return null;
                return (
                  <span
                    key={item.key}
                    className={`text-[10px] px-1.5 py-0.5 border ${
                      v === "issue" ? "border-red text-red" : "border-line text-ink/50"
                    }`}
                  >
                    {item.label}: {v === "ok" ? "OK" : v === "issue" ? "Issue" : "N/A"}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mt-2">{error}</div>}

      {rescheduling && (
        <form onSubmit={handleReschedule} className="mt-2 space-y-2">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[10px] text-ink/50 mb-1">New Date</label>
              <input name="date" type="date" required className="border border-line bg-parchment text-xs px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-[10px] text-ink/50 mb-1">New Time</label>
              <input name="time" type="time" className="border border-line bg-parchment text-xs px-2 py-1.5" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-ink/50 mb-1">Reason for rescheduling (optional)</label>
            <textarea
              name="reschedule_reason"
              rows={2}
              className="w-full border border-line bg-parchment text-xs px-2 py-1.5"
              placeholder="e.g. Client asked to move to afternoon, staff conflict..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Confirm"}
          </button>
        </form>
      )}

      {cancelling && (
        <form onSubmit={handleCancel} className="mt-2 space-y-2">
          <div>
            <label className="block text-[10px] text-ink/50 mb-1">Reason for cancelling (optional)</label>
            <textarea
              name="reason"
              rows={2}
              className="w-full border border-line bg-parchment text-xs px-2 py-1.5"
              placeholder="e.g. Client rescheduled arrival, staff unavailable..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="text-xs bg-red text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
          >
            {saving ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </form>
      )}

      {editingNotes && (
        <form onSubmit={handleSaveNotes} className="mt-2 space-y-2">
          {isInspection && (
            <div className="border border-line p-2 space-y-1.5">
              <p className="text-[10px] text-ink/50 uppercase tracking-wide mb-1">Inspection Checklist</p>
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink/80">{item.label}</span>
                  <select
                    value={checklist[item.key] ?? ""}
                    onChange={(e) => setChecklist((prev) => ({ ...prev, [item.key]: e.target.value }))}
                    className="border border-line bg-parchment text-xs px-1.5 py-1"
                  >
                    <option value="">—</option>
                    <option value="ok">OK</option>
                    <option value="issue">Issue</option>
                    <option value="na">N/A</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="block text-[10px] text-ink/50 mb-1">Visit Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={visit.notes ?? ""}
              className="w-full border border-line bg-parchment text-xs px-2 py-1.5"
              placeholder="What did the coordinator observe on this visit?"
            />
          </div>
          <div>
            <label className="block text-[10px] text-ink/50 mb-1">Recommendations</label>
            <textarea
              name="recommendations"
              rows={2}
              defaultValue={visit.recommendations ?? ""}
              className="w-full border border-line bg-parchment text-xs px-2 py-1.5"
              placeholder="Anything the client should know or approve?"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Notes"}
          </button>
        </form>
      )}
    </div>
  );
}
