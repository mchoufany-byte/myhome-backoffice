import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { ClientInfoCard } from "./ClientInfoCard";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  await requireSection("clients");
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, email, phone, secondary_email, secondary_phone, preferred_language, contact_preference, payment_method_type, contact_person_name, contact_person_phone, contact_person_relationship, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, notes, photo_url, client_type, company_name, cr_number, tax_number"
    )
    .eq("id", params.id)
    .single();

  if (!client) notFound();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, nickname, address, zone, plan_tier, status")
    .eq("client_id", params.id);

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/clients" className="text-xs text-green font-medium">
        &larr; Clients
      </Link>

      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold mt-4">Client</p>
      <h1 className="text-2xl font-serif text-green mt-1">
        {client.client_type === "company" && client.company_name ? client.company_name : client.name}
      </h1>
      <p className="text-sm text-ink/50 mb-6">
        {client.client_type === "company" && client.company_name ? `Signatory: ${client.name}` : " "}
      </p>

      <ClientInfoCard client={client} />

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Properties</p>
      <div className="bg-surface border border-line divide-y divide-line">
        {properties?.map((p) => (
          <Link key={p.id} href={`/properties/${p.id}`} className="block px-4 py-3 hover:bg-surfaceAlt">
            <p className="text-sm font-medium text-ink">{p.nickname || p.address}</p>
            <p className="text-xs text-ink/50 mt-0.5 capitalize">
              {p.zone ?? "—"} · {p.plan_tier ?? "—"} · {p.status ?? "active"}
            </p>
          </Link>
        ))}
        {!properties?.length && <p className="px-4 py-3 text-sm text-ink/50">No properties on file.</p>}
      </div>
    </div>
  );
}
