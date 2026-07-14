import { requireSection } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ACTION_LABEL: Record<string, string> = {
  delete: "Deleted",
  deactivate: "Deactivated",
  reactivate: "Reactivated",
  mark_paid: "Marked Paid",
  void: "Voided",
  generate_invoices: "Generated Invoices",
};

export default async function AuditLogPage() {
  await requireSection("audit_log");
  const supabase = createClient();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, staff_name, action, table_name, record_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Governance</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">Audit Log</h1>
      <p className="text-sm text-ink/60 mb-6">
        A record of who did what for the highest-risk actions: deletes, staff status changes, and invoice
        mark-paid/void/generate. Not every action in the app is logged here — this covers what matters most if
        something needs to be traced back later.
      </p>

      <div className="bg-surface border border-line divide-y divide-line">
        {entries?.map((e: any) => (
          <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink">
                <span className="font-medium">{e.staff_name ?? "Unknown staff"}</span>{" "}
                <span className="text-ink/60">{ACTION_LABEL[e.action] ?? e.action}</span>{" "}
                <span className="text-ink/40 capitalize">{e.table_name?.replace(/_/g, " ")}</span>
              </p>
              {e.detail && <p className="text-xs text-ink/50 mt-0.5">{e.detail}</p>}
            </div>
            <p className="text-xs text-ink/40 whitespace-nowrap">{fmt(e.created_at)}</p>
          </div>
        ))}
        {!entries?.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing logged yet.</p>}
      </div>
    </div>
  );
}
