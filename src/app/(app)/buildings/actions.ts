"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createBuilding(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();

  const client_id = String(formData.get("client_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!client_id || !name) return;

  await supabase.from("buildings").insert({ client_id, name, address, notes });
  await logAudit(supabase, staff, "create", "buildings", null, `Added building ${name}`);
  revalidatePath("/buildings");
}

// Generates one due charge per active unit for the current period, at that
// unit's common_charge_amount. Safe to click more than once a month -- the
// unique(unit_id, period) constraint means units that already have a charge
// for this period are silently skipped.
export async function generateCommonCharges(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();
  const building_id = String(formData.get("building_id") ?? "");
  if (!building_id) return;

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 5).toISOString().slice(0, 10);

  const { data: units } = await supabase
    .from("building_units")
    .select("id, common_charge_amount")
    .eq("building_id", building_id)
    .eq("is_active", true);

  const { data: existing } = await supabase
    .from("building_charges")
    .select("unit_id")
    .eq("building_id", building_id)
    .eq("period", period);
  const already = new Set((existing ?? []).map((c) => c.unit_id));

  const rows = (units ?? [])
    .filter((u) => !already.has(u.id))
    .map((u) => ({
      building_id,
      unit_id: u.id,
      period,
      amount: Number(u.common_charge_amount ?? 0),
      status: "due" as const,
      due_date: dueDate,
    }));

  if (rows.length) {
    await supabase.from("building_charges").insert(rows);
    await logAudit(
      supabase,
      staff,
      "generate_charges",
      "building_charges",
      building_id,
      `Generated ${rows.length} common charge(s) for ${period}`
    );
  }

  revalidatePath(`/buildings/${building_id}`);
}

export async function markChargePaid(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const building_id = String(formData.get("building_id") ?? "");
  if (!id) return;

  await supabase.from("building_charges").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
  await logAudit(supabase, staff, "mark_paid", "building_charges", id, "Common charge marked paid");
  revalidatePath(`/buildings/${building_id}`);
}
