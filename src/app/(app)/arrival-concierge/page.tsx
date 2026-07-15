import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { ArrivalRow } from "./ArrivalRow";

export default async function ArrivalConciergePage() {
  const currentStaff = await requireSection("arrival_concierge");
  const supabase = createClient();

  const [{ data: arrivals }, { data: staffList }] = await Promise.all([
    supabase
      .from("arrival_requests")
      .select(
        "id, arrival_date, arrival_time, airport_pickup, flowers, groceries, temperature_pref, lights_at_dusk, linen_cleaning, notes, status, assigned_staff_id, fee_amount, fee_invoiced, created_at, completed_at, property_id, properties(nickname, address, clients(name)), staff:assigned_staff_id(name)"
      )
      .order("arrival_date", { ascending: true }),
    supabase.from("staff").select("id, name").eq("is_active", true).order("name", { ascending: true }),
  ]);

  const open = (arrivals ?? []).filter((a: any) => a.status !== "completed");
  const done = (arrivals ?? []).filter((a: any) => a.status === "completed");

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Operations</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Arrival Concierge</h1>

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Upcoming / Open ({open.length})</p>
      <div className="bg-surface border border-line divide-y divide-line mb-8">
        {open.map((a: any) => (
          <ArrivalRow
            key={a.id}
            arrival={a}
            staffList={staffList ?? []}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        ))}
        {!open.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing pending.</p>}
      </div>

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Completed ({done.length})</p>
      <div className="bg-surface border border-line divide-y divide-line">
        {done.slice(0, 20).map((a: any) => (
          <ArrivalRow
            key={a.id}
            arrival={a}
            staffList={staffList ?? []}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        ))}
        {!done.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing completed yet.</p>}
      </div>
    </div>
  );
}
