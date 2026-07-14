"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markInvoicePaid(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  const paid_from = String(formData.get("paid_from") ?? "") || null;
  if (!id) return;

  await supabase.from("client_invoices").update({ status: "paid", paid_at: new Date().toISOString(), paid_from }).eq("id", id);
  revalidatePath("/billing/invoices");
  revalidatePath(`/billing/invoices/${id}`);
}

export async function voidInvoice(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("client_invoices").update({ status: "void" }).eq("id", id);
  revalidatePath("/billing/invoices");
  revalidatePath(`/billing/invoices/${id}`);
}
