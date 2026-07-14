import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { NewRequestForm } from "./NewRequestForm";
import { MaintenanceFeeAction } from "./MaintenanceFeeAction";

function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  quote_ready: "Awaiting Client Approval",
  awaiting_approval: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  declined: "Declined",
};

export default async function MaintenancePage() {
  await requireSection("maintenance");
  const supabase = createClient();

  const [{ data: jobs }, { data: properties }] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select(
        "id, title, description, status, quote_amount, quote_url, vendor, created_at, coordination_fee, fee_invoiced, properties(nickname, address)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("properties").select("id, nickname, address").order("nickname", { ascending: true }),
  ]);

  const active = jobs?.filter((j) => j.status !== "completed" && j.status !== "declined") ?? [];
  const completed = jobs?.filter((j) => j.status === "completed") ?? [];
  const declined = jobs?.filter((j) => j.status === "declined") ?? [];

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Operations</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Maintenance</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Active</p>
          <div className="bg-surface border border-line divide-y divide-line mb-8">
            {active.map((j: any) => (
              <div key={j.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink text-sm">{j.title}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      {j.properties?.nickname || j.properties?.address} · {shortDate(j.created_at)}
                      {j.vendor ? ` · ${j.vendor}` : ""}
                      {j.quote_amount ? ` · $${Number(j.quote_amount).toFixed(2)}` : ""}
                    </p>
                    {j.description && <p className="text-xs text-ink/60 mt-1.5">{j.description}</p>}
                    {j.quote_url && (
                      <a
                        href={j.quote_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green font-medium hover:underline mt-1.5 inline-block"
                      >
                        View Quote &rarr;
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-1 border border-gold text-gold whitespace-nowrap uppercase tracking-wide">
                    {STATUS_LABEL[j.status] ?? j.status}
                  </span>
                </div>
                {(j.status === "in_progress" || j.status === "awaiting_approval") && (
                  <div className="mt-3">
                    <MaintenanceFeeAction jobId={j.id} quoteAmount={j.quote_amount ? Number(j.quote_amount) : null} />
                  </div>
                )}
              </div>
            ))}
            {!active.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing active.</p>}
          </div>

          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Completed</p>
          <div className="bg-surface border border-line divide-y divide-line mb-8">
            {completed.map((j: any) => (
              <div key={j.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{j.title}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {j.properties?.nickname || j.properties?.address}
                    {j.coordination_fee != null ? ` · Fee $${Number(j.coordination_fee).toFixed(2)}` : ""}
                    {j.fee_invoiced ? " · Invoiced" : j.coordination_fee != null ? " · Not yet invoiced" : ""}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 border border-line text-ink/60 uppercase tracking-wide">
                  {STATUS_LABEL[j.status] ?? j.status}
                </span>
              </div>
            ))}
            {!completed.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing completed yet.</p>}
          </div>

          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Declined</p>
          <div className="bg-surface border border-line divide-y divide-line">
            {declined.map((j: any) => (
              <div key={j.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{j.title}</p>
                  <p className="text-xs text-ink/50 mt-0.5">{j.properties?.nickname || j.properties?.address}</p>
                </div>
                <span className="text-[10px] px-2 py-1 border border-red text-red uppercase tracking-wide">
                  {STATUS_LABEL[j.status] ?? j.status}
                </span>
              </div>
            ))}
            {!declined.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing declined.</p>}
          </div>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">New Request</p>
          <NewRequestForm properties={properties ?? []} />
        </div>
      </div>
    </div>
  );
}
