"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function suggestFee(quoteAmount: number | null) {
  if (!quoteAmount) return "25.00";
  return Math.max(quoteAmount * 0.12, 25).toFixed(2);
}

export function MaintenanceFeeAction({ jobId, quoteAmount }: { jobId: string; quoteAmount: number | null }) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [fee, setFee] = useState(() => suggestFee(quoteAmount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const n = parseFloat(fee);
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("maintenance_requests")
      .update({ status: "completed", coordination_fee: Number.isFinite(n) ? n : null })
      .eq("id", jobId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
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
          onBlur={() => setFee((v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v).toFixed(2) : "0.00"))}
          type="number"
          step="0.01"
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
