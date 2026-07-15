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
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  complete: "Completed",
  assign: "Assigned",
  cancel: "Cancelled",
  reschedule: "Rescheduled",
  update_notes: "Updated Notes",
  update_status: "Updated Status",
  checkout: "Checked Out",
  return: "Returned",
  issue: "Issued",
  resolve: "Resolved",
  deactivate: "Deactivated",
  reactivate: "Reactivated",
  mark_paid: "Marked Paid",
  top_up: "Topped Up",
  void: "Voided",
  generate_invoices: "Generated Invoices",
  mark_lapsed: "Marked Lapsed",
  confirm_lapsed: "Confirmed Lapsed",
  reactivate_billing: "Reactivated Billing",
};

type Entry = {
  id: string;
  staff_name: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  detail: string | null;
  created_at: string;
};

export default async function AuditLogPage() {
  await requireSection("audit_log");
  const supabase = createClient();

  const { data: entries } = await supabase
    .from("audit_log")
    .select("id, staff_name, action, table_name, record_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  // Group by staff member -- entries within each group stay reverse-chronological
  // (already sorted that way from the query), groups themselves sort alphabetically
  // by name so it's easy to scan "what has this person done."
  const groups = new Map<string, Entry[]>();
  for (const e of (entries ?? []) as Entry[]) {
    const name = e.staff_name ?? "Unknown staff";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(e);
  }
  const sortedNames = [...groups.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Governance</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">Audit Log</h1>
      <p className="text-sm text-ink/60 mb-6">
        A record of who did what, grouped by staff member. Covers writes across the app -- creates, edits,
        assignments, status changes, and deletes. Read-only actions (just viewing a record) aren't logged, only
        changes. Showing the most recent 200 entries.
      </p>

      <div className="space-y-6">
        {sortedNames.map((name) => {
          const group = groups.get(name)!;
          return (
            <div key={name}>
              <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
                {name} <span className="text-ink/40 normal-case tracking-normal">({group.length})</span>
              </p>
              <div className="bg-surface border border-line divide-y divide-line">
                {group.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-ink">
                        <span className="text-ink/60">{ACTION_LABEL[e.action] ?? e.action}</span>{" "}
                        <span className="text-ink/40 capitalize">{e.table_name?.replace(/_/g, " ")}</span>
                      </p>
                      {e.detail && <p className="text-xs text-ink/50 mt-0.5">{e.detail}</p>}
                    </div>
                    <p className="text-xs text-ink/40 whitespace-nowrap">{fmt(e.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!entries?.length && <p className="px-4 py-6 text-sm text-ink/50 bg-surface border border-line">Nothing logged yet.</p>}
      </div>
    </div>
  );
}
