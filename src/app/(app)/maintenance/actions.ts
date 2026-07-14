"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createMaintenanceRequest(formData: FormData) {
  const supabase = createClient();

  const property_id = String(formData.get("property_id") ?? "");
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "") || null;
  const vendor = String(formData.get("vendor") ?? "") || null;
  const quoteRaw = String(formData.get("quote_amount") ?? "");
  const quote_amount = quoteRaw ? Number(quoteRaw) : null;

  if (!property_id || !title) return;

  await supabase.from("maintenance_requests").insert({
    property_id,
    title,
    description,
    vendor,
    quote_amount,
    status: "quote_ready",
  });

  revalidatePath("/maintenance");
}

export async function markMaintenanceCompleted(id: string) {
  const supabase = createClient();
  await supabase.from("maintenance_requests").update({ status: "completed" }).eq("id", id);
  revalidatePath("/maintenance");
}
