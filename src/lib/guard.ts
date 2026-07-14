import { notFound } from "next/navigation";
import { requireStaff, type CurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canAccess, getAccessMap, type Section } from "@/lib/roles";

// Call at the top of any page under (app)/ that should be restricted beyond
// what the nav already hides -- guards against someone just typing the URL.
export async function requireSection(section: Section): Promise<CurrentStaff> {
  const staff = await requireStaff();
  const supabase = createClient();
  const accessMap = await getAccessMap(supabase);
  if (!canAccess(accessMap, staff.role, section)) {
    notFound();
  }
  return staff;
}
