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

