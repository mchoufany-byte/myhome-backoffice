"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

export function StaffAccess({
  staffId,
  staffName,
  isActive,
  isOwner,
  currentStaff,
}: {
  staffId: string;
  staffName: string;
  isActive: boolean;
  isOwner: boolean;
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleActive() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("staff").update({ is_active: !isActive }).eq("id", staffId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(
      supabase,
      currentStaff,
      isActive ? "deactivate" : "reactivate",
      "staff",
      staffId,
      `${isActive ? "Deactivated" : "Reactivated"} ${staffName}`
    );
    router.refresh();
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", staffId);
    setSaving(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await logAudit(supabase, currentStaff, "delete", "staff", staffId, `Deleted ${staffName}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span
        className={`text-[10px] px-2 py-1 border uppercase tracking-wide whitespace-nowrap ${
          isActive ? "border-line text-ink/60" : "border-red text-red"
        }`}
      >
        {isActive ? "Active" : "Deactivated"}
      </span>

      {error && <p className="text-[10px] text-red max-w-[140px]">{error}</p>}

      {!isOwner ? (
        <span className="text-[10px] text-ink/30">Owner only</span>
      ) : confirmingDelete ? (
        <div className="flex flex-col items-start gap-1">
          <span className="text-[10px] text-ink/60">Delete permanently?</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs text-red font-medium hover:underline disabled:opacity-60"
            >
              {saving ? "Deleting..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-xs text-ink/50 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={saving}
            className="text-xs text-ink/60 font-medium hover:underline whitespace-nowrap disabled:opacity-60"
          >
            {isActive ? "Deactivate" : "Reactivate"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-ink/40 hover:text-red hover:underline whitespace-nowrap"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
