"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProperty(formData: FormData) {
  const supabase = createClient();

  const nickname = String(formData.get("nickname") ?? "") || null;
  const address = String(formData.get("address") ?? "");
  const client_id = String(formData.get("client_id") ?? "") || null;
  const zone = String(formData.get("zone") ?? "") || null;
  const plan_tier = String(formData.get("plan_tier") ?? "") || null;
  const status = String(formData.get("status") ?? "") || null;
  const key_custody = String(formData.get("key_custody") ?? "") || null;

  if (!address || !client_id) return;

  await supabase.from("properties").insert({
    nickname,
    address,
    client_id,
    zone,
    plan_tier,
    status,
    key_custody,
  });

  revalidatePath("/properties");
}
