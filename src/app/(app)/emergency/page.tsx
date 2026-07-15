import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { EmergencyRow } from "./EmergencyRow";

const SLA_HOURS = 4;

export default async function EmergencyPage() {
  const currentStaff = await requireSection("emergency");
  const supabase = createClient();

  const [{ data: incidents }, { data: staffList }] = await Promise.all([
    supabase
      .from("emergency_incidents")
      .select(
        "id, type, status, reported_at, resolved_at, notes, assigned_staff_id, property_id, properties(nickname, address, clients(name)), staff:assigned_staff_id(name)"
      )
      .order("reported_at", { ascending: false }),
    supabase.from("staff").select("id, name").eq("is_active", true).order("name", { ascending: true }),
  ]);

  const now = Date.now();
  const withElapsed = (incidents ?? []).map((inc: any) => {
    const reportedMs = inc.reported_at ? new Date(inc.reported_at).getTime() : now;
    const endMs = inc.resolved_at ? new Date(inc.resolved_at).getTime() : now;
    const hoursElapsed = (endMs - reportedMs) / 3600000;
    return { ...inc, hoursElapsed, slaBreached: inc.status !== "resolved" && hoursElapsed > SLA_HOURS };
  });

  const open = withElapsed.filter((i) => i.status !== "resolved");
  const resolved = withElapsed.filter((i) => i.status === "resolved");
  const breachedCount = open.filter((i) => i.slaBreached).length;

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Operations</p>
      <div className="flex items-center gap-3 mt-1 mb-6">
        <h1 className="text-2xl font-serif text-green">Emergency Incidents</h1>
        {breachedCount > 0 && (
          <span className="text-[10px] px-2 py-1 border border-red text-red uppercase tracking-wide font-medium">
            {breachedCount} past {SLA_HOURS}h SLA
          </span>
        )}
      </div>

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
        Open ({open.length})
      </p>
      <div className="bg-surface border border-line divide-y divide-line mb-8">
        {open.map((inc: any) => (
          <EmergencyRow
            key={inc.id}
            incident={inc}
            staffList={staffList ?? []}
            slaHours={SLA_HOURS}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        ))}
        {!open.length && <p className="px-4 py-6 text-sm text-ink/50">No open incidents. Good.</p>}
      </div>

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
        Resolved ({resolved.length})
      </p>
      <div className="bg-surface border border-line divide-y divide-line">
        {resolved.slice(0, 20).map((inc: any) => (
          <EmergencyRow
            key={inc.id}
            incident={inc}
            staffList={staffList ?? []}
            slaHours={SLA_HOURS}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        ))}
        {!resolved.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing resolved yet.</p>}
      </div>
    </div>
  );
}
