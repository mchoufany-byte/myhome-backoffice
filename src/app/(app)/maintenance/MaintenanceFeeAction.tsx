"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

function suggestFee(quoteAmount: number | null) {
  if (!quoteAmount) return "25.00";
  return Math.max(quoteAmount * 0.12, 25).toFixed(2);
}

export function MaintenanceFeeAction({
  jobId,
  quoteAmount,
  currentStaff,
}: {
  jobId: string;
  quoteAmount: number | null;
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [fee, setFee] = useState(() => suggestFee(quoteAmount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const n = parseFloat(fee);
    if (fee.trim() !== "" && (!Number.isFinite(n) || n < 0)) {
      setError("Fee must be a number of 0 or more.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("maintenance_requests")
      .update({ status: "completed", coordination_fee: Number.isFinite(n) ? n : null, completed_at: new Date().toISOString() })
      .eq("id", jobId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "complete", "maintenance_requests", jobId, "Marked completed");
    router.refresh();
  }

  if (!completing) {
    return (
      <button type="button" onClick={() => setCompleting(true)} className="text-xs text-green font-medium hover:underline">
        Mark Completed
      </button>
    );
  }

  return (
    <form onSubmit={handleComplete} className="mt-2 flex items-end gap-2">
      <div>
        <label className="block text-[10px] text-ink/50 mb-1">Coordination Fee ($)</label>
        <input
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          onBlur={() => setFee((v) => (Number.isFinite(parseFloat(v)) ? Math.max(0, parseFloat(v)).toFixed(2) : "0.00"))}
          type="number"
          step="0.01"
          min="0"
          className="w-24 border border-line bg-parchment text-xs px-2 py-1.5"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="text-xs bg-green text-parchment font-medium px-3 py-1.5 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Confirm Completed"}
      </button>
      <button type="button" onClick={() => setCompleting(false)} className="text-xs text-ink/50 hover:underline">
        Cancel
      </button>
      {error && <span className="text-xs text-red">{error}</span>}
    </form>
  );
}
