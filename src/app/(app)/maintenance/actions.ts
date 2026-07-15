"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createMaintenanceRequest(formData: FormData) {
  const supabase = createClient();
  const staff = await requireStaff();

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

  await logAudit(supabase, staff, "create", "maintenance_requests", null, `Created ${title}`);

  revalidatePath("/maintenance");
}

export async function markMaintenanceCompleted(id: string) {
  const supabase = createClient();
  const staff = await requireStaff();
  await supabase.from("maintenance_requests").update({ status: "completed" }).eq("id", id);
  await logAudit(supabase, staff, "complete", "maintenance_requests", id, "Marked completed");
  revalidatePath("/maintenance");
}
