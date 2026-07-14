"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const GRACE_DAYS = 7;

export function BillingStatusCard({
  propertyId,
  billingStatus,
  lapsedAt,
}: {
  propertyId: string;
  billingStatus: string;
  lapsedAt: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(patch: Record<string, unknown>) {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("properties").update(patch).eq("id", propertyId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  if (billingStatus === "active" || !billingStatus) {
    return (
      <div className="bg-surface border border-line p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Billing Status</p>
            <p className="text-sm text-green mt-1">Active</p>
          </div>
          <button
            type="button"
            onClick={() => update({ billing_status: "grace_period", lapsed_at: new Date().toISOString() })}
            disabled={saving}
            className="text-xs text-red/70 font-medium hover:underline disabled:opacity-60"
          >
            Mark Payment Lapsed
          </button>
        </div>
        {error && <p className="text-xs text-red mt-2">{error}</p>}
      </div>
    );
  }

  const lapsedDate = lapsedAt ? new Date(lapsedAt) : null;
  const graceEnds = lapsedDate ? new Date(lapsedDate.getTime() + GRACE_DAYS * 86400000) : null;
  const graceExpired = graceEnds ? graceEnds.getTime() < Date.now() : false;
  const daysLeft = graceEnds ? Math.max(0, Math.ceil((graceEnds.getTime() - Date.now()) / 86400000)) : 0;

  if (billingStatus === "grace_period") {
    return (
      <div className="bg-surface border border-gold p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Billing Status</p>
            <p className="text-sm text-gold mt-1">
              {graceExpired ? "Grace period ended" : `Grace period — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
            </p>
            {graceEnds && (
              <p className="text-xs text-ink/50 mt-0.5">
                Checks, cleaning, and maintenance coordination pause if this lapses. Ends {graceEnds.toLocaleDateString()}.
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => update({ billing_status: "active", lapsed_at: null })}
              disabled={saving}
              className="text-xs text-green font-medium hover:underline disabled:opacity-60"
            >
              Reactivate
            </button>
            {graceExpired && (
              <button
                type="button"
                onClick={() => update({ billing_status: "lapsed" })}
                disabled={saving}
                className="text-xs text-red font-medium hover:underline disabled:opacity-60"
              >
                Confirm Lapsed
              </button>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-red mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-red p-4 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Billing Status</p>
          <p className="text-sm text-red mt-1">Lapsed</p>
          <p className="text-xs text-ink/50 mt-0.5">
            New service requests and arrival concierge are paused for this property. Reactivating is immediate — no
            re-enrollment fee within 60 days of lapse.
          </p>
        </div>
        <button
          type="button"
          onClick={() => update({ billing_status: "active", lapsed_at: null })}
          disabled={saving}
          className="text-xs text-green font-medium hover:underline disabled:opacity-60"
        >
          Reactivate
        </button>
      </div>
      {error && <p className="text-xs text-red mt-2">{error}</p>}
    </div>
  );
}
