import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { PLAN_INFO, planTierOf } from "@/lib/packages";
import { PropertyInfoCard } from "./PropertyInfoCard";
import { PropertyGallery } from "./PropertyGallery";
import { DeleteEntityButton } from "@/components/DeleteEntityButton";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const currentStaff = await requireSection("properties");
  const isOwner = currentStaff.role === "owner";
  const supabase = createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, nickname, address, zone, plan_tier, status, key_custody, client_id, clients(id, name, email, phone)")
    .eq("id", params.id)
    .single();

  if (!property) notFound();
  const client = (property as any).clients;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const [
    { data: visits },
    { data: maintenance },
    { data: float },
    { count: visitsThisMonth },
    { data: openMaintenance },
    { data: openRequests },
    { data: clients },
    { data: photos },
  ] = await Promise.all([
    supabase
      .from("visits")
      .select("id, type, scheduled_at, checked_in_at, checked_out_at")
      .eq("property_id", params.id)
      .order("scheduled_at", { ascending: false })
      .limit(5),
    supabase
      .from("maintenance_requests")
      .select("id, title, status, created_at")
      .eq("property_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("utility_float").select("balance, last_topup_amount, last_topup_at").eq("property_id", params.id).maybeSingle(),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("property_id", params.id)
      .gte("scheduled_at", monthStart.toISOString())
      .lt("scheduled_at", monthEnd.toISOString()),
    supabase
      .from("maintenance_requests")
      .select("id, title, status")
      .eq("property_id", params.id)
      .not("status", "in", "(completed,declined)"),
    supabase
      .from("requests")
      .select("id, type, status")
      .eq("property_id", params.id)
      .not("status", "in", "(completed,fulfilled,cancelled,declined)"),
    supabase.from("clients").select("id, name").order("name", { ascending: true }),
    supabase
      .from("property_photos")
      .select("id, url, caption")
      .eq("property_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const tier = planTierOf(property.plan_tier);
  const tierInfo = tier ? PLAN_INFO[tier] : null;
  const quota = tierInfo?.visitsPerMonth ?? null;
  const doneThisMonth = visitsThisMonth ?? 0;
  const visitsRemaining = quota !== null ? Math.max(quota - doneThisMonth, 0) : null;
  const openItemsCount = (openMaintenance?.length ?? 0) + (openRequests?.length ?? 0);

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/properties" className="text-xs text-green font-medium">
        &larr; Properties
      </Link>

      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold mt-4">Property</p>
      <h1 className="text-2xl font-serif text-green mt-1">{property.nickname || property.address}</h1>
      <p className="text-sm text-ink/60 mb-6">{property.address}</p>

      <PropertyInfoCard
        property={property}
        clients={clients ?? []}
        clientName={client?.name ?? null}
        floatBalance={float ? Number(float.balance ?? 0) : null}
      />

      <PropertyGallery propertyId={property.id} photos={photos ?? []} />

      {tier && tierInfo && (
        <div className="bg-surface border border-line p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">
              Package &mdash; {tier} (${tierInfo.price}/mo)
            </p>
            {openItemsCount > 0 && (
              <span className="text-[10px] px-2 py-1 border border-red text-red uppercase tracking-wide">
                {openItemsCount} open item{openItemsCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink/50 uppercase tracking-wide">Visits This Month</p>
              {quota !== null ? (
                <>
                  <p className={`text-sm mt-1 ${visitsRemaining! > 0 ? "text-red font-medium" : "text-ink"}`}>
                    {doneThisMonth} of {quota} scheduled
                  </p>
                  {visitsRemaining! > 0 && (
                    <p className="text-xs text-red/80 mt-0.5">{visitsRemaining} still owed this month</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink mt-1">On-demand &mdash; no fixed quota ({doneThisMonth} so far)</p>
              )}
            </div>
            <div>
              <p className="text-xs text-ink/50 uppercase tracking-wide">Open Items</p>
              {openItemsCount === 0 ? (
                <p className="text-sm text-ink mt-1">Nothing outstanding</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {openMaintenance?.map((m) => (
                    <li key={m.id} className="text-sm text-ink">
                      Maintenance: {m.title} <span className="text-xs text-ink/50 capitalize">({m.status})</span>
                    </li>
                  ))}
                  {openRequests?.map((r) => (
                    <li key={r.id} className="text-sm text-ink capitalize">
                      Request: {r.type ?? "other"} <span className="text-xs text-ink/50">({r.status})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-xs text-ink/50 uppercase tracking-wide mt-4 mb-1.5">Included in {tier}</p>
          <ul className="text-xs text-ink/70 space-y-1">
            {tierInfo.features.map((f) => (
              <li key={f}>&#10003; {f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Recent Visits</p>
          <div className="bg-surface border border-line divide-y divide-line">
            {visits?.map((v) => (
              <div key={v.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink capitalize">{v.type?.replace("_", " ") ?? "Visit"}</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  {v.scheduled_at ? new Date(v.scheduled_at).toLocaleDateString() : "Unscheduled"}
                  {v.checked_out_at ? " · Complete" : v.checked_in_at ? " · In progress" : ""}
                </p>
              </div>
            ))}
            {!visits?.length && <p className="px-4 py-3 text-sm text-ink/50">No visits yet.</p>}
          </div>
        </section>

        <section>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Maintenance</p>
          <div className="bg-surface border border-line divide-y divide-line">
            {maintenance?.map((m) => (
              <div key={m.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink">{m.title}</p>
                <p className="text-xs text-ink/50 mt-0.5 capitalize">{m.status}</p>
              </div>
            ))}
            {!maintenance?.length && <p className="px-4 py-3 text-sm text-ink/50">No maintenance history.</p>}
          </div>
        </section>
      </div>

      <DeleteEntityButton table="properties" id={property.id} isOwner={isOwner} redirectTo="/properties" entityLabel="property" />
    </div>
  );
}
