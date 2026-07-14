import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { PLAN_INFO, planTierOf } from "@/lib/packages";

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const inner = (
    <div className="bg-surface border border-line p-5 hover:border-gold/50 transition-colors">
      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">{label}</p>
      <p className="text-3xl font-serif text-green mt-2">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const staff = await requireStaff();
  const supabase = createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const [
    { count: propertiesCount },
    { count: clientsCount },
    { count: todaysVisitsCount },
    { data: pendingMaintenance },
    { data: openRequests },
    { data: unpaidBills },
    { data: lowFloat },
    { data: allProperties },
    { data: visitsThisMonth },
    { data: allOpenMaintenance },
    { data: allOpenRequests },
  ] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", todayStart.toISOString())
      .lte("scheduled_at", todayEnd.toISOString()),
    supabase
      .from("maintenance_requests")
      .select("id, title, status, quote_amount, created_at")
      .in("status", ["quote_ready", "awaiting_approval"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("requests")
      .select("id, type, status, created_at")
      .not("status", "in", "(completed,fulfilled,cancelled,declined)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bills")
      .select("id, category, amount, status, created_at")
      .neq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("utility_float").select("property_id, balance").lt("balance", 50),
    supabase.from("properties").select("id, nickname, address, plan_tier"),
    supabase
      .from("visits")
      .select("property_id")
      .gte("scheduled_at", monthStart.toISOString())
      .lt("scheduled_at", monthEnd.toISOString()),
    supabase.from("maintenance_requests").select("property_id, title, status").not("status", "in", "(completed,declined)"),
    supabase
      .from("requests")
      .select("property_id, type, status")
      .not("status", "in", "(completed,fulfilled,cancelled,declined)"),
  ]);

  // Roll up, per property: visits scheduled this month vs. what the plan tier
  // promises, plus any open maintenance/requests -- answers "what's left
  // undone from the package" instead of just "which package do they have."
  const visitCounts = new Map<string, number>();
  visitsThisMonth?.forEach((v) => {
    if (!v.property_id) return;
    visitCounts.set(v.property_id, (visitCounts.get(v.property_id) ?? 0) + 1);
  });

  const needsAttention = (allProperties ?? [])
    .map((p) => {
      const tier = planTierOf(p.plan_tier);
      const quota = tier ? PLAN_INFO[tier].visitsPerMonth : null;
      const done = visitCounts.get(p.id) ?? 0;
      const visitsOwed = quota !== null ? Math.max(quota - done, 0) : 0;
      const openMaint = allOpenMaintenance?.filter((m) => m.property_id === p.id) ?? [];
      const openReq = allOpenRequests?.filter((r) => r.property_id === p.id) ?? [];
      return {
        id: p.id,
        name: p.nickname || p.address,
        tier,
        visitsOwed,
        openCount: openMaint.length + openReq.length,
      };
    })
    .filter((p) => p.visitsOwed > 0 || p.openCount > 0)
    .sort((a, b) => b.visitsOwed + b.openCount - (a.visitsOwed + a.openCount))
    .slice(0, 6);

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Overview</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Welcome back, {staff.name.split(" ")[0]}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Properties" value={propertiesCount ?? 0} href="/properties" />
        <StatCard label="Clients" value={clientsCount ?? 0} href="/clients" />
        <StatCard label="Visits Today" value={todaysVisitsCount ?? 0} href="/visits" />
        <StatCard label="Low Float Accounts" value={lowFloat?.length ?? 0} href="/billing" />
      </div>

      <section className="bg-surface border border-line p-5 mb-6">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
          Properties Behind on Package
        </p>
        {!needsAttention.length && <p className="text-sm text-ink/50">Every property is caught up.</p>}
        <ul className="divide-y divide-line">
          {needsAttention.map((p) => (
            <li key={p.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/properties/${p.id}`} className="text-sm font-medium text-ink hover:text-green">
                {p.name}
              </Link>
              <p className="text-ink/50 text-xs mt-0.5">
                {p.tier ? `${p.tier} plan` : "No plan set"}
                {p.visitsOwed > 0 ? ` · ${p.visitsOwed} visit${p.visitsOwed === 1 ? "" : "s"} owed this month` : ""}
                {p.openCount > 0 ? ` · ${p.openCount} open item${p.openCount === 1 ? "" : "s"}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid md:grid-cols-3 gap-6">
        <section className="bg-surface border border-line p-5">
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
            Maintenance Awaiting Action
          </p>
          {!pendingMaintenance?.length && <p className="text-sm text-ink/50">Nothing pending.</p>}
          <ul className="space-y-3">
            {pendingMaintenance?.map((m) => (
              <li key={m.id} className="text-sm">
                <p className="font-medium text-ink">{m.title}</p>
                <p className="text-ink/50 text-xs mt-0.5">
                  {m.status} {m.quote_amount ? `· $${Number(m.quote_amount).toFixed(2)}` : ""}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/maintenance" className="text-xs text-green font-medium mt-4 inline-block">
            View all &rarr;
          </Link>
        </section>

        <section className="bg-surface border border-line p-5">
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Open Client Requests</p>
          {!openRequests?.length && <p className="text-sm text-ink/50">Nothing open.</p>}
          <ul className="space-y-3">
            {openRequests?.map((r) => (
              <li key={r.id} className="text-sm">
                <p className="font-medium text-ink capitalize">{r.type ?? "Request"}</p>
                <p className="text-ink/50 text-xs mt-0.5">{r.status}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-surface border border-line p-5">
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Unpaid Bills</p>
          {!unpaidBills?.length && <p className="text-sm text-ink/50">Nothing outstanding.</p>}
          <ul className="space-y-3">
            {unpaidBills?.map((b) => (
              <li key={b.id} className="text-sm">
                <p className="font-medium text-ink capitalize">{b.category ?? "Bill"}</p>
                <p className="text-ink/50 text-xs mt-0.5">
                  ${Number(b.amount).toFixed(2)} · {b.status}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/billing" className="text-xs text-green font-medium mt-4 inline-block">
            View all &rarr;
          </Link>
        </section>
      </div>
    </div>
  );
}
