"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteEntityButton({
  table,
  id,
  isOwner,
  redirectTo,
  entityLabel,
}: {
  table: string;
  id: string;
  isOwner: boolean;
  redirectTo: string;
  entityLabel: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from(table).delete().eq("id", id);
    setDeleting(false);
    if (deleteError) {
      setError(
        deleteError.message.toLowerCase().includes("foreign key")
          ? `Can't delete -- other records (visits, bills, photos, etc.) still reference this ${entityLabel}. Remove those first.`
          : deleteError.message
      );
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="mt-10 pt-6 border-t border-line">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-red/70 mb-2">Danger Zone</p>
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mb-2 max-w-md">{error}</div>}
      {confirming ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink/70">Permanently delete this {entityLabel}?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red font-medium hover:underline disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-sm text-ink/50 hover:underline">
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red/70 font-medium hover:underline">
          Delete {entityLabel}
        </button>
      )}
    </div>
  );
}
