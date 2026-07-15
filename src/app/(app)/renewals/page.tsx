import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { RenewalRow } from "./RenewalRow";
import { NewRenewalForm } from "./NewRenewalForm";

export default async function RenewalsPage() {
  const currentStaff = await requireSection("renewals");
  const supabase = createClient();

  const [{ data: renewals }, { data: staffList }, { data: properties }, { data: renewalTypes }] = await Promise.all([
    supabase
      .from("renewals")
      .select(
        "id, renewal_type, status, due_date, assigned_staff_id, fee_amount, fee_invoiced, notes, created_at, completed_at, property_id, properties(nickname, address, clients(name)), staff:assigned_staff_id(name)"
      )
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("staff").select("id, name").eq("is_active", true).order("name", { ascending: true }),
    supabase.from("properties").select("id, nickname, address").order("nickname", { ascending: true }),
    supabase.from("renewal_types").select("key, label, is_system").order("label", { ascending: true }),
  ]);

  const open = (renewals ?? []).filter((r: any) => r.status !== "completed");
  const done = (renewals ?? []).filter((r: any) => r.status === "completed");

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Operations</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Renewal Handling</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Open ({open.length})</p>
          <div className="bg-surface border border-line divide-y divide-line mb-8">
            {open.map((r: any) => (
              <RenewalRow
                key={r.id}
                renewal={r}
                staffList={staffList ?? []}
                renewalTypes={renewalTypes ?? []}
                currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
              />
            ))}
            {!open.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing open.</p>}
          </div>

          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Completed ({done.length})</p>
          <div className="bg-surface border border-line divide-y divide-line">
            {done.slice(0, 20).map((r: any) => (
              <RenewalRow
                key={r.id}
                renewal={r}
                staffList={staffList ?? []}
                renewalTypes={renewalTypes ?? []}
                currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
              />
            ))}
            {!done.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing completed yet.</p>}
          </div>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Log Renewal</p>
          <NewRenewalForm
            properties={properties ?? []}
            renewalTypes={renewalTypes ?? []}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        </div>
      </div>
    </div>
  );
}
