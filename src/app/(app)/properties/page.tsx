import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { NewPropertyForm } from "./NewPropertyForm";

export default async function PropertiesPage() {
  await requireSection("properties");
  const supabase = createClient();

  const [{ data: properties }, { data: clients }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, nickname, address, zone, plan_tier, status, clients(name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <div className="p-8">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Portfolio</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Properties</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-surface border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Property</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Zone</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {properties?.map((p: any) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surfaceAlt">
                    <td className="px-4 py-3">
                      <Link href={`/properties/${p.id}`} className="font-medium text-ink hover:text-green">
                        {p.nickname || p.address}
                      </Link>
                      {p.nickname && <p className="text-xs text-ink/50 mt-0.5">{p.address}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink/80">{p.clients?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/80 capitalize">{p.zone ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/80 capitalize">{p.plan_tier ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 border border-line capitalize">{p.status ?? "active"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!properties?.length && <p className="p-6 text-sm text-ink/50">No properties yet.</p>}
          </div>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">New Property</p>
          <NewPropertyForm clients={clients ?? []} />
        </div>
      </div>
    </div>
  );
}
