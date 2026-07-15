import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { NewVisitForm } from "./NewVisitForm";
import { VisitRow } from "./VisitRow";

const TYPES = [
  { value: "morning_visit", label: "Morning Visit" },
  { value: "cleaning", label: "Scheduled Cleaning" },
  { value: "inspection", label: "Inspection" },
  { value: "pre_arrival", label: "Pre-Arrival Deep Clean" },
];

function fmt(iso: string | null) {
  if (!iso) return "Unscheduled";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeLabel(type: string | null) {
  return TYPES.find((t) => t.value === type)?.label ?? type ?? "Visit";
}

export default async function VisitsPage() {
  const currentStaff = await requireSection("visits");
  const supabase = createClient();

  const [{ data: visits }, { data: properties }, { data: staffList }] = await Promise.all([
    supabase
      .from("visits")
      .select(
        "id, type, scheduled_at, checked_in_at, checked_out_at, cancelled_at, cancel_reason, reschedule_reason, staff_id, second_staff_id, notes, recommendations, inspection_checklist, properties(nickname, address), staff:staff_id(name), second_staff:second_staff_id(name)"
      )
      .order("scheduled_at", { ascending: false })
      .limit(50),
    supabase.from("properties").select("id, nickname, address").order("nickname", { ascending: true }),
    supabase.from("staff").select("id, name, role").order("name", { ascending: true }),
  ]);

  const upcoming = visits?.filter((v) => !v.checked_out_at && !v.cancelled_at) ?? [];
  const completed = visits?.filter((v) => v.checked_out_at && !v.cancelled_at) ?? [];
  const cancelled = visits?.filter((v) => v.cancelled_at) ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Operations</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Visits</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
              Upcoming &amp; In Progress
            </p>
            <div className="bg-surface border border-line divide-y divide-line">
              {upcoming.map((v: any) => (
                <VisitRow
                  key={v.id}
                  visit={v}
                  staffList={staffList ?? []}
                  TYPES={TYPES}
                  currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
                />
              ))}
              {!upcoming.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing scheduled.</p>}
            </div>
          </section>

          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Completed</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {completed.slice(0, 10).map((v: any) => (
                <VisitRow
                  key={v.id}
                  visit={v}
                  staffList={staffList ?? []}
                  TYPES={TYPES}
                  completed
                  currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
                />
              ))}
              {!completed.length && <p className="px-4 py-6 text-sm text-ink/50">No completed visits yet.</p>}
            </div>
          </section>

          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Cancelled</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {cancelled.slice(0, 10).map((v: any) => (
                <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{typeLabel(v.type)}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {v.properties?.nickname || v.properties?.address} · was {fmt(v.scheduled_at)}
                      {v.cancel_reason ? ` · ${v.cancel_reason}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-red">{fmt(v.cancelled_at)}</p>
                </div>
              ))}
              {!cancelled.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing cancelled.</p>}
            </div>
          </section>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Schedule Visit</p>
          <NewVisitForm
            properties={properties ?? []}
            staffList={staffList ?? []}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        </div>
      </div>
    </div>
  );
}
