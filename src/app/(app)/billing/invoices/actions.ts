"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PLAN_INFO, planTierOf } from "@/lib/packages";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { dueDateForPeriod } from "@/lib/billing";

export async function markInvoicePaid(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const paid_from = String(formData.get("paid_from") ?? "") || null;
  if (!id) return;

  await supabase.from("client_invoices").update({ status: "paid", paid_at: new Date().toISOString(), paid_from }).eq("id", id);
  await logAudit(supabase, staff, "mark_paid", "client_invoices", id, `Marked paid via ${paid_from ?? "unspecified"}`);
  revalidatePath("/billing/invoices");
  revalidatePath(`/billing/invoices/${id}`);
}

export async function voidInvoice(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("client_invoices").update({ status: "void" }).eq("id", id);
  await logAudit(supabase, staff, "void", "client_invoices", id, "Invoice voided");
  revalidatePath("/billing/invoices");
  revalidatePath(`/billing/invoices/${id}`);
}

// Bulk-generates one invoice per client for the current billing period,
// covering: (1) the monthly package fee for each active property on a plan
// tier, and (2) any completed-but-not-yet-invoiced maintenance coordination
// fees, arrival concierge fees, and renewal handling fees for that client's
// properties. Skips any client who already has an invoice for this period,
// so it's safe to click more than once a month. This is a manual trigger,
// not a cron job -- someone still has to click it, but it replaces building
// every client's invoice by hand.
export async function generateMonthlyInvoices() {
  const supabase = createClient();
  const staff = await requireStaff();

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Derived from the period itself (not "today"), so every invoice generated
  // for this period -- this run or a future one -- gets the same due date.
  const dueDateStr = dueDateForPeriod(period);

  const [
    { data: existingForPeriod },
    { data: properties },
    { data: unbilledMaintenance },
    { data: unbilledArrivals },
    { data: unbilledRenewals },
    { data: renewalTypes },
  ] = await Promise.all([
    supabase.from("client_invoices").select("client_id").eq("billing_period", period),
    supabase.from("properties").select("id, client_id, nickname, address, plan_tier, status"),
    supabase
      .from("maintenance_requests")
      .select("id, title, coordination_fee, property_id")
      .eq("status", "completed")
      .eq("fee_invoiced", false)
      .not("coordination_fee", "is", null),
    supabase
      .from("arrival_requests")
      .select("id, arrival_date, fee_amount, property_id")
      .eq("status", "completed")
      .eq("fee_invoiced", false),
    supabase
      .from("renewals")
      .select("id, renewal_type, fee_amount, property_id")
      .eq("status", "completed")
      .eq("fee_invoiced", false),
    supabase.from("renewal_types").select("key, label"),
  ]);

  const renewalTypeLabel = new Map((renewalTypes ?? []).map((t) => [t.key, t.label]));

  const alreadyInvoiced = new Set((existingForPeriod ?? []).map((i) => i.client_id));

  const byClient = new Map<string, { id: string; nickname: string | null; address: string; plan_tier: string | null }[]>();
  for (const p of properties ?? []) {
    if (!p.client_id || p.status !== "active" || alreadyInvoiced.has(p.client_id)) continue;
    if (!byClient.has(p.client_id)) byClient.set(p.client_id, []);
    byClient.get(p.client_id)!.push(p);
  }

  let createdCount = 0;
  const maintenanceIdsToMark: string[] = [];
  const arrivalIdsToMark: string[] = [];
  const renewalIdsToMark: string[] = [];

  for (const [clientId, props] of byClient) {
    const lineItems: { description: string; amount: number }[] = [];
    const propIds = new Set(props.map((p) => p.id));

    for (const p of props) {
      const tier = planTierOf(p.plan_tier);
      const price = tier ? PLAN_INFO[tier].price : 0;
      if (price) {
        lineItems.push({
          description: `Monthly Package Fee — ${p.plan_tier} — ${p.nickname || p.address}`,
          amount: price,
        });
      }
    }

    for (const m of unbilledMaintenance ?? []) {
      if (!m.property_id || !propIds.has(m.property_id) || m.coordination_fee == null) continue;
      lineItems.push({ description: `Maintenance Coordination Fee — ${m.title}`, amount: Number(m.coordination_fee) });
      maintenanceIdsToMark.push(m.id);
    }

    for (const a of unbilledArrivals ?? []) {
      if (!a.property_id || !propIds.has(a.property_id)) continue;
      lineItems.push({
        description: `Arrival Concierge${a.arrival_date ? ` — ${a.arrival_date}` : ""}`,
        amount: Number(a.fee_amount ?? 30),
      });
      arrivalIdsToMark.push(a.id);
    }

    for (const r of unbilledRenewals ?? []) {
      if (!r.property_id || !propIds.has(r.property_id)) continue;
      lineItems.push({
        description: `Renewal Handling — ${renewalTypeLabel.get(r.renewal_type) ?? r.renewal_type}`,
        amount: Number(r.fee_amount ?? 50),
      });
      renewalIdsToMark.push(r.id);
    }

    if (!lineItems.length) continue;

    const total = lineItems.reduce((sum, li) => sum + li.amount, 0);
    const { error: insertError } = await supabase.from("client_invoices").insert({
      client_id: clientId,
      billing_period: period,
      line_items: lineItems,
      amount: total,
      due_date: dueDateStr,
      status: "issued",
    });
    if (!insertError) createdCount++;
  }

  if (maintenanceIdsToMark.length) {
    await supabase.from("maintenance_requests").update({ fee_invoiced: true }).in("id", maintenanceIdsToMark);
  }
  if (arrivalIdsToMark.length) {
    await supabase.from("arrival_requests").update({ fee_invoiced: true }).in("id", arrivalIdsToMark);
  }
  if (renewalIdsToMark.length) {
    await supabase.from("renewals").update({ fee_invoiced: true }).in("id", renewalIdsToMark);
  }

  if (createdCount) {
    await logAudit(
      supabase,
      staff,
      "generate_invoices",
      "client_invoices",
      null,
      `Generated ${createdCount} invoice(s) for ${period}`
    );
  }

  revalidatePath("/billing/invoices");
  return { createdCount, period, skippedAlreadyInvoiced: alreadyInvoiced.size };
}
