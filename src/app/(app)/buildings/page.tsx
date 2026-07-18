import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { createBuilding } from "./actions";
import { SuppliersPanel } from "./SuppliersPanel";

function clientLabel(c: any) {
  if (!c) return "—";
  return c.client_type === "company" && c.company_name ? c.company_name : c.name;
}

export default async function BuildingsPage() {
  const currentStaff = await requireSection("buildings");
  const supabase = createClient();

  const [{ data: buildings }, { data: clients }, { data: suppliers }, { data: units }] = await Promise.all([
    supabase
      .from("buildings")
      .select("id, name, address, client_id, clients(name, client_type, company_name)")
      .order("name", { ascending: true }),
    supabase.from("clients").select("id, name, client_type, company_name").order("name", { ascending: true }),
    supabase
      .from("building_suppliers")
      .select("key, name, category, contact_phone, contact_email, is_active")
      .order("name", { ascending: true }),
    supabase.from("building_units").select("id, building_id").eq("is_active", true),
  ]);

  const unitCount = new Map<string, number>();
  for (const u of units ?? []) {
    unitCount.set(u.building_id, (unitCount.get(u.building_id) ?? 0) + 1);
  }

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Operations</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">Buildings</h1>
      <p className="text-sm text-ink/60 mb-6">
        For clients managed as a whole building rather than a single apartment — flats with recurring common
        charges, generator/fuel/other expenses, and a running cash ledger per building.
      </p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-surface border border-line divide-y divide-line">
            {(buildings ?? []).map((b: any) => (
              <Link
                key={b.id}
                href={`/buildings/${b.id}`}
                className="block px-4 py-3 hover:bg-parchmentAlt transition-colors"
              >
                <p className="text-sm font-medium text-ink">{b.name}</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  {clientLabel(b.clients)} · {b.address ?? "No address on file"} ·{" "}
                  {unitCount.get(b.id) ?? 0} flat{(unitCount.get(b.id) ?? 0) === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
            {!buildings?.length && <p className="px-4 py-6 text-sm text-ink/50">No buildings yet.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Add Building</p>
            <form action={createBuilding} className="bg-surface border border-line p-4 space-y-3">
              <div>
                <label className="block text-xs text-ink/60 mb-1">Client</label>
                <select
                  name="client_id"
                  required
                  className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {clientLabel(c)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-ink/40 mt-1">
                  Don't see the client? <Link href="/clients" className="underline">Add them under Clients</Link> first.
                </p>
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Building Name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Sea View Residence"
                  className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Address (optional)</label>
                <input name="address" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Notes (optional)</label>
                <textarea name="notes" rows={2} className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
              </div>
              <button type="submit" className="w-full bg-green text-parchment text-sm font-medium py-2.5">
                Add Building
              </button>
            </form>
          </div>

          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Suppliers</p>
            <SuppliersPanel
              suppliers={(suppliers ?? []) as any}
              currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
