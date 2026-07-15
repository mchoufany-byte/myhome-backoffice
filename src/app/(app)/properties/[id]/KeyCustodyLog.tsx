"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type KeyEvent = {
  id: string;
  action: "checkout" | "return";
  purpose: string | null;
  expected_return_at: string | null;
  logged_at: string | null;
  notes: string | null;
  staff: { name: string } | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function KeyCustodyLog({
  propertyId,
  events,
  staffList,
  isOutWithStaff,
  currentStaff,
}: {
  propertyId: string;
  events: KeyEvent[];
  staffList: { id: string; name: string }[];
  isOutWithStaff: string | null; // name of staff currently holding the key, if any
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [logging, setLogging] = useState<"checkout" | "return" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const staff_id = (form.elements.namedItem("staff_id") as HTMLSelectElement)?.value || null;
    const purpose = (form.elements.namedItem("purpose") as HTMLInputElement)?.value || null;
    const expected_return = (form.elements.namedItem("expected_return") as HTMLInputElement)?.value || null;

    if (!logging) return;

    if (logging === "checkout" && !staff_id) {
      setError("Pick which staff member is taking the key.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("key_custody_events").insert({
      property_id: propertyId,
      staff_id,
      action: logging,
      purpose,
      expected_return_at: expected_return ? new Date(expected_return).toISOString() : null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    const staffName = staffList.find((s) => s.id === staff_id)?.name;
    await logAudit(
      supabase,
      currentStaff,
      logging,
      "key_custody_events",
      propertyId,
      logging === "checkout" ? `Checked out to ${staffName ?? "staff"}` : "Key returned"
    );
    setLogging(null);
    router.refresh();
  }

  return (
    <div className="bg-surface border border-line p-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Key Custody Log</p>
        <div className="flex gap-3">
          <button
            onClick={() => setLogging(logging === "checkout" ? null : "checkout")}
            className="text-xs text-green font-medium hover:underline"
          >
            {logging === "checkout" ? "Cancel" : "Log Checkout"}
          </button>
          <button
            onClick={() => setLogging(logging === "return" ? null : "return")}
            className="text-xs text-ink/60 font-medium hover:underline"
          >
            {logging === "return" ? "Cancel" : "Log Return"}
          </button>
        </div>
      </div>

      <p className="text-xs text-ink/60 mb-3">
        {isOutWithStaff ? (
          <span className="text-gold font-medium">Key currently checked out to {isOutWithStaff}</span>
        ) : (
          "Key is not currently checked out."
        )}
      </p>

      {logging && (
        <form onSubmit={handleSubmit} className="space-y-2 mb-4 border-t border-line pt-3">
          {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}
          {logging === "checkout" && (
            <div>
              <label className="block text-xs text-ink/60 mb-1">Staff Member</label>
              <select name="staff_id" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
                <option value="">Select...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-ink/60 mb-1">Purpose</label>
            <input
              name="purpose"
              placeholder="e.g. Scheduled monthly visit"
              className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
            />
          </div>
          {logging === "checkout" && (
            <div>
              <label className="block text-xs text-ink/60 mb-1">Expected Return</label>
              <input
                name="expected_return"
                type="datetime-local"
                className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-green text-parchment text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Saving..." : logging === "checkout" ? "Confirm Checkout" : "Confirm Return"}
          </button>
        </form>
      )}

      <div className="divide-y divide-line">
        {events.map((ev) => (
          <div key={ev.id} className="py-2 text-sm flex items-center justify-between">
            <div>
              <span className={`font-medium ${ev.action === "checkout" ? "text-gold" : "text-green"}`}>
                {ev.action === "checkout" ? "Checked out" : "Returned"}
              </span>{" "}
              <span className="text-ink/70">&middot; {ev.staff?.name ?? "Unknown staff"}</span>
              {ev.purpose && <p className="text-xs text-ink/50 mt-0.5">{ev.purpose}</p>}
            </div>
            <p className="text-xs text-ink/50 shrink-0">{fmt(ev.logged_at)}</p>
          </div>
        ))}
        {!events.length && <p className="py-2 text-sm text-ink/50">No key events logged yet.</p>}
      </div>
    </div>
  );
}
