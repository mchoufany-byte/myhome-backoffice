import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentStaff = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  photo_url: string | null;
};

// Looks up the staff row for the signed-in Supabase Auth user. If there's no
// matching staff row (e.g. a client account, or someone not yet provisioned
// as staff), they're not allowed into the backoffice at all -- signed out
// and sent back to /login with an explanation.
export async function requireStaff(): Promise<CurrentStaff> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, role, email, photo_url, is_active")
    .eq("auth_id", user!.id)
    .single();

  if (!staff) {
    await supabase.auth.signOut();
    redirect("/login?error=not_staff");
  }

  // is_active defaults to true for existing rows (column added later), so
  // only an explicit false blocks access -- deactivated staff keep their
  // history on visits/maintenance/etc, they just can't sign in anymore.
  if (staff.is_active === false) {
    await supabase.auth.signOut();
    redirect("/login?error=deactivated");
  }

  return staff as CurrentStaff;
}
