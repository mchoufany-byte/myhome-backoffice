"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Incident = {
  id: string;
  type: string | null;
  status: string;
  reported_at: string | null;
  resolved_at: string | null;
  notes: string | null;
  assigned_staff_id: string | null;
  hoursElapsed: number;
  slaBreached: boolean;
  properties?: { nickname: string | null; address: string; clients?: { name: string } | null } | null;
  staff?: { name: string } | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function typeLabel(type: string | null) {
  if (!type) return "Emergency";
  return type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function elapsedLabel(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} hrs`;
}

const STATUS_LABEL: Record<string, string> = {
  reported: "Reported",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function EmergencyRow({
  incident,
  staffList,
  slaHours,
}: {
  incident: Incident;
  staffList: { id: string; name: string }[];
  slaHours: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  async function updateStatus(status: string, resolutionNotes?: string) {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const patch: Record<string, unknown> = { status };
    if (status === "resolved") {
      patch.resolved_at = new Date().toISOString();
      if (resolutionNotes) patch.notes = resolutionNotes;
    }
    const { error: updateError } = await supabase.from("emergency_incidents").update(patch).eq("id", incident.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setResolving(false);
    router.refresh();
  }

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const assigned_staff_id = (e.currentTarget.elements.namedItem("assigned_staff_id") as HTMLSelectElement).value || null;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("emergency_incidents")
      .update({ assigned_staff_id })
      .eq("id", incident.id);
    if (updateError) setError(updateError.message);
    else router.refresh();
  }

  async function handleResolve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const notes = (e.currentTarget.elements.namedItem("resolution_notes") as HTMLTextAreaElement).value || undefined;
    await updateStatus("resolved", notes);
  }

  const isOpen = incident.status !== "resolved";

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink text-sm">{typeLabel(incident.type)}</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {incident.properties?.nickname || incident.properties?.address}
            {incident.properties?.clients?.name ? ` · ${incident.properties.clients.name}` : ""} · reported{" "}
            {fmt(incident.reported_at)}
          </p>
          {incident.notes && <p className="text-xs text-ink/60 mt-1.5">{incident.notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-[10px] px-2 py-1 border uppercase tracking-wide whitespace-nowrap ${
              incident.status === "resolved"
                ? "border-line text-ink/60"
                : incident.slaBreached
                ? "border-red text-red font-medium"
                : "border-gold text-gold"
            }`}
          >
            {STATUS_LABEL[incident.status] ?? incident.status}
          </span>
          <span className={`text-[10px] ${incident.slaBreached ? "text-red" : "text-ink/40"}`}>
            {elapsedLabel(incident.hoursElapsed)}
            {isOpen ? ` (SLA ${slaHours}h)` : ""}
          </span>
        </div>
      </div>

      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mt-2">{error}</div>}

      {isOpen && (
        <div className="mt-3 space-y-2">
          <form onSubmit={handleAssign} className="flex items-center gap-2">
            <select
              name="assigned_staff_id"
              defaultValue={incident.assigned_staff_id ?? ""}
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

            {incident.status === "reported" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => updateStatus("in_progress")}
                className="text-xs text-gold font-medium hover:underline ml-2 disabled:opacity-60"
              >
                Mark In Progress
              </button>
            )}
            <button
              type="button"
              onClick={() => setResolving((v) => !v)}
              className="text-xs text-green font-medium hover:underline ml-2"
            >
              {resolving ? "Cancel" : "Resolve"}
            </button>
          </form>

          {resolving && (
            <form onSubmit={handleResolve} className="space-y-2">
              <textarea
                name="resolution_notes"
                rows={2}
                defaultValue={incident.notes ?? ""}
                placeholder="What happened and how it was resolved..."
                className="w-full border border-line bg-parchment text-xs px-2 py-1.5"
              />
              <button
                type="submit"
                disabled={saving}
                className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Confirm Resolved"}
              </button>
            </form>
          )}
        </div>
      )}

      {!isOpen && (
        <p className="text-xs text-ink/40 mt-2">
          {incident.staff?.name ? `Handled by ${incident.staff.name} · ` : ""}resolved {fmt(incident.resolved_at)}
        </p>
      )}
    </div>
  );
}
