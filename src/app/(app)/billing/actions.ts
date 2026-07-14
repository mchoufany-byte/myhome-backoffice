"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createBill(formData: FormData) {
  const supabase = createClient();

  const property_id = String(formData.get("property_id") ?? "");
  const category = String(formData.get("category") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const billing_period = String(formData.get("billing_period") ?? "") || null;
  const amount = amountRaw ? Number(amountRaw) : null;

  if (!property_id || !category || amount === null) return;

  await supabase.from("bills").insert({
    property_id,
    category,
    amount,
    billing_period,
    status: "due",
  });

  revalidatePath("/billing");
}

export async function markBillPaid(formData: FormData) {
  const supabase = createClient();
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
  }

  revalidatePath("/billing");
}

export async function topUpFloat(formData: FormData) {
  const supabase = createClient();

  const property_id = String(formData.get("property_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const amount = amountRaw ? Number(amountRaw) : 0;
  if (!property_id || !amount) return;

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

  revalidatePath("/billing");
}
