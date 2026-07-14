import { requireSection } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { PLAN_INFO, planTierOf, PLAN_TIERS } from "@/lib/packages";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-line p-5">
      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">{label}</p>
      <p className="text-3xl font-serif text-green mt-2">{value}</p>
      {sub && <p className="text-xs text-ink/50 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  await requireSection("analytics");
  const supabase = createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [
    { data: properties },
    { data: recentVisits },
    { data: resolvedIncidents },
    { count: openIncidentsCount },
    { data: invoicesThisPeriod },
    { count: recentlyLapsedCount },
  ] = await Promise.all([
    supabase.from("properties").select("id, plan_tier, status, billing_status"),
    supabase
      .from("visits")
      .select("id, staff_id, checked_out_at, cancelled_at, scheduled_at")
      .gte("scheduled_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("emergency_incidents")
      .select("id, reported_at, resolved_at")
      .eq("status", "resolved")
      .gte("reported_at", thirtyDaysAgo.toISOString()),
    supabase.from("emergency_incidents").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("client_invoices").select("client_id, line_items").eq("billing_period", period),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("billing_status", "lapsed")
      .gte("lapsed_at", thirtyDaysAgo.toISOString()),
  ]);

  const activeProperties = (properties ?? []).filter((p) => (p.status ?? "active") === "active");
  const totalProperties = properties?.length ?? 0;

  // MRR: sum of each active property's tier price, excluding properties that
  // have lapsed (grace period still counts -- they haven't stopped paying yet).
  const mrr = activeProperties.reduce((sum, p) => {
    if (p.billing_status === "lapsed") return sum;
    const tier = planTierOf(p.plan_tier);
    return sum + (tier ? PLAN_INFO[tier].price : 0);
  }, 0);

  // Tier utilization
  const tierCounts: Record<string, number> = {};
  for (const t of PLAN_TIERS) tierCounts[t] = 0;
  activeProperties.forEach((p) => {
    const tier = planTierOf(p.plan_tier);
    if (tier) tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  });

  // Apartments per coordinator -- distinct staff assigned to a visit in the
  // last 30 days, as a proxy for "active field coordinators."
  const distinctStaff = new Set((recentVisits ?? []).map((v) => v.staff_id).filter(Boolean));
  const apartmentsPerCoordinator = distinctStaff.size > 0 ? (totalProperties / distinctStaff.size).toFixed(1) : "—";

  // Visit completion rate this window
  const completedVisits = (recentVisits ?? []).filter((v) => v.checked_out_at && !v.cancelled_at).length;
  const cancelledVisits = (recentVisits ?? []).filter((v) => v.cancelled_at).length;
  const totalVisits = recentVisits?.length ?? 0;
  const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : null;

  // Emergency response
  const resolutionHours = (resolvedIncidents ?? [])
    .map((i) => (i.resolved_at && i.reported_at ? (new Date(i.resolved_at).getTime() - new Date(i.reported_at).getTime()) / 3600000 : null))
    .filter((h): h is number => h !== null);
  const avgResolutionHours = resolutionHours.length ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length : null;
  const withinSla = resolutionHours.filter((h) => h <= 4).length;
  const slaCompliance = resolutionHours.length ? Math.round((withinSla / resolutionHours.length) * 100) : null;

  // Add-on revenue per client this period (anything on an invoice that isn't
  // a "Monthly Package Fee" line)
  let addOnTotal = 0;
  const clientsInvoiced = new Set<string>();
  (invoicesThisPeriod ?? []).forEach((inv: any) => {
    clientsInvoiced.add(inv.client_id);
    (inv.line_items ?? []).forEach((li: any) => {
      if (!String(li.description ?? "").startsWith("Monthly Package Fee")) {
        addOnTotal += Number(li.amount) || 0;
      }
    });
  });
  const addOnPerClient = clientsInvoiced.size > 0 ? addOnTotal / clientsInvoiced.size : 0;

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Governance</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">Analytics</h1>
      <p className="text-sm text-ink/60 mb-6">
        Computed live from what's actually in the system. Figures marked "last 30 days" are a rolling window, not a
        calendar month.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Metric label="MRR" value={`$${mrr.toLocaleString()}`} sub={`${activeProperties.length} active properties`} />
        <Metric
          label="Apartments / Coordinator"
          value={apartmentsPerCoordinator}
          sub={distinctStaff.size ? `${distinctStaff.size} staff logged a visit` : "No visits in last 30 days"}
        />
        <Metric
          label="Add-on Revenue / Client"
          value={`$${addOnPerClient.toFixed(0)}`}
          sub={`${period} · ${clientsInvoiced.size} client${clientsInvoiced.size === 1 ? "" : "s"} invoiced`}
        />
        <Metric
          label="Recently Lapsed"
          value={String(recentlyLapsedCount ?? 0)}
          sub="Properties lapsed in last 30 days"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Metric
          label="Visit Completion Rate"
          value={completionRate !== null ? `${completionRate}%` : "—"}
          sub={`${completedVisits}/${totalVisits} last 30 days`}
        />
        <Metric
          label="Emergency SLA Compliance"
          value={slaCompliance !== null ? `${slaCompliance}%` : "No resolved incidents"}
          sub="Resolved within 4 hours, last 30 days"
        />
        <Metric
          label="Avg. Emergency Resolution"
          value={avgResolutionHours !== null ? `${avgResolutionHours.toFixed(1)}h` : "—"}
          sub="Last 30 days"
        />
        <Metric label="Open Emergencies" value={String(openIncidentsCount ?? 0)} sub="Right now" />
      </div>

      <div className="bg-surface border border-line p-5 mb-8">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Tier Mix</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PLAN_TIERS.map((t) => {
            const count = tierCounts[t] ?? 0;
            const pct = activeProperties.length ? Math.round((count / activeProperties.length) * 100) : 0;
            return (
              <div key={t}>
                <p className="text-sm font-medium text-ink">{t}</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  {count} propert{count === 1 ? "y" : "ies"} · {pct}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface border border-line p-5">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-2">Not Tracked Here</p>
        <p className="text-xs text-ink/60">
          NPS, referral rate, CAC/LTV, and DSCR aren't computed on this page — they need inputs this system doesn't
          capture (client surveys, marketing spend, external financial statements). Churn is approximated by
          "recently lapsed" above, which only reflects data from the point billing-status tracking went live — it
          will get more meaningful as history accumulates.
        </p>
      </div>
    </div>
  );
}
