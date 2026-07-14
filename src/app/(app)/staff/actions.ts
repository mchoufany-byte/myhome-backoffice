"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStaffRole(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !role) return;

  await supabase.from("staff").update({ role }).eq("id", id);
  revalidatePath("/staff");
}

export async function setStaffActive(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") ?? "");
  const is_active = formData.get("is_active") === "true";
  if (!id) return;

  await supabase.from("staff").update({ is_active }).eq("id", id);
  revalidatePath("/staff");
}
