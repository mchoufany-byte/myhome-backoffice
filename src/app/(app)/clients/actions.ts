"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createClientRecord(formData: FormData) {
  const supabase = createClient();

  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "") || null;
  const preferred_language = String(formData.get("preferred_language") ?? "") || null;

  if (!name || !email) return;

  // auth_id is left null -- this creates the client's record so a property
  // can be attached and onboarding can start before they've ever logged
  // into the app. Once they sign up in My Home with this same email,
  // link auth.users.id into this row's auth_id (a SQL update for now).
  await supabase.from("clients").insert({ name, email, phone, preferred_language });

  revalidatePath("/clients");
}
