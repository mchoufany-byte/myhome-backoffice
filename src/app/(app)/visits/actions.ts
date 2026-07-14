"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function scheduleVisit(formData: FormData) {
  const supabase = createClient();

  const property_id = String(formData.get("property_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const staff_id = String(formData.get("staff_id") ?? "") || null;
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");

  if (!property_id || !type || !date) return;

  const scheduled_at = time ? new Date(`${date}T${time}`).toISOString() : new Date(`${date}T09:00`).toISOString();

  await supabase.from("visits").insert({
    property_id,
    type,
    staff_id,
    scheduled_at,
  });

  revalidatePath("/visits");
}

export async function assignStaff(formData: FormData) {
  const supabase = createClient();
  const visit_id = String(formData.get("visit_id") ?? "");
  const staff_id = String(formData.get("staff_id") ?? "") || null;
  if (!visit_id) return;

  await supabase.from("visits").update({ staff_id }).eq("id", visit_id);
  revalidatePath("/visits");
}
