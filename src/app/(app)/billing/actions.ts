"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createBill(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();

  const property_id = String(formData.get("property_id") ?? "");
  const category = String(formData.get("category") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const billing_period = String(formData.get("billing_period") ?? "") || null;
  const amount = amountRaw ? Number(amountRaw) : null;

  // Reject non-numeric and negative amounts outright -- Number("abc") is NaN,
  // which is not null and would otherwise sail through to the database.
  if (!property_id || !category || amount === null || !Number.isFinite(amount) || amount < 0) return;

  await supabase.from("bills").insert({
    property_id,
    category,
    amount,
    billing_period,
    status: "due",
  });

  await logAudit(supabase, staff, "create", "bills", null, `Created ${category} bill for $${amount.toFixed(2)}`);

  revalidatePath("/billing");
}

export async function markBillPaid(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const paid_from = String(formData.get("paid_from") ?? "") || null;
  if (!id) return;

  // Need the bill's property_id + amount before marking it paid, since a
  // "Utility Float" payment also has to deduct from that property's float
  // balance -- otherwise the balance shown in Utility Float Balances would
  // silently drift from reality every time a bill gets paid out of it.
  const { data: bill } = await supabase.from("bills").select("property_id, amount").eq("id", id).single();

  await supabase
    .from("bills")
    .update({ status: "paid", paid_at: new Date().toISOString(), paid_from })
    .eq("id", id);

  if (paid_from === "float" && bill) {
    const { data: floatRow } = await supabase
      .from("utility_float")
      .select("balance")
      .eq("property_id", bill.property_id)
      .maybeSingle();

    const newBalance = Number(floatRow?.balance ?? 0) - Number(bill.amount);

    await supabase.from("utility_float").upsert({
      property_id: bill.property_id,
      balance: newBalance,
    });

    await supabase.from("float_transactions").insert({
      property_id: bill.property_id,
      type: "draw",
      amount: Number(bill.amount),
      bill_id: id,
      staff_id: staff.id,
    });
  }

  await logAudit(supabase, staff, "mark_paid", "bills", id, `Marked paid via ${paid_from ?? "unspecified"}`);

  revalidatePath("/billing");
}

export async function topUpFloat(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();

  const property_id = String(formData.get("property_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const amount = amountRaw ? Number(amountRaw) : 0;
  if (!property_id || !amount || !Number.isFinite(amount) || amount <= 0) return;

  const { data: existing } = await supabase
    .from("utility_float")
    .select("balance")
    .eq("property_id", property_id)
    .maybeSingle();

  const newBalance = Number(existing?.balance ?? 0) + amount;

  await supabase.from("utility_float").upsert({
    property_id,
    balance: newBalance,
    last_topup_amount: amount,
    last_topup_at: new Date().toISOString(),
  });

  await supabase.from("float_transactions").insert({
    property_id,
    type: "topup",
    amount,
    staff_id: staff.id,
  });

  await logAudit(supabase, staff, "top_up", "utility_float", property_id, `Topped up $${amount.toFixed(2)}`);

  revalidatePath("/billing");
}
