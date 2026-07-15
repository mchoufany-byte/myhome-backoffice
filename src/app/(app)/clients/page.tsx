import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { NewClientForm } from "./NewClientForm";

export default async function ClientsPage() {
  const currentStaff = await requireSection("clients");
  const supabase = createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, preferred_language, client_type, company_name, properties(id)")
    .order("name", { ascending: true });

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Portfolio</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Clients</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-surface border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Phone</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Language</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Properties</th>
                </tr>
              </thead>
              <tbody>
                {clients?.map((c: any) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surfaceAlt">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium text-ink hover:text-green">
                        {c.client_type === "company" && c.company_name ? c.company_name : c.name}
                      </Link>
                      {c.client_type === "company" && c.company_name && (
                        <p className="text-xs text-ink/50 mt-0.5">{c.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/80">{c.email}</td>
                    <td className="px-4 py-3 text-ink/80">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/80 capitalize">{c.preferred_language ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/80">{c.properties?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!clients?.length && <p className="p-6 text-sm text-ink/50">No clients yet.</p>}
          </div>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">New Client</p>
          <NewClientForm currentStaff={{ id: currentStaff.id, name: currentStaff.name }} />
        </div>
      </div>
    </div>
  );
}
