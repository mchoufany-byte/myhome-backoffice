import Link from "next/link";
import { requireSection } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { getRoles, getAccessMap, ALL_SECTIONS, SECTION_LABELS } from "@/lib/roles";
import { RolesManager } from "./RolesManager";

export default async function RolesPage() {
  const staff = await requireSection("staff");
  const supabase = createClient();

  const [roles, accessMap] = await Promise.all([getRoles(supabase), getAccessMap(supabase)]);

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/staff" className="text-xs text-ink/50 hover:text-ink">
        &larr; Back to Staff
      </Link>
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold mt-3">Team</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Custom Roles</h1>

      {staff.role !== "owner" ? (
        <div className="bg-surface border border-line p-6 text-sm text-ink/60">
          Only the owner role can create or edit roles. You can view current Role Permissions on the Staff page.
        </div>
      ) : (
        <>
          <p className="text-sm text-ink/60 mb-6 max-w-xl">
            Create roles and choose which sections of the backoffice each one can see. This only controls
            navigation/page access -- database write permissions for a brand-new role may still need to be
            granted separately.
          </p>
          <RolesManager initialRoles={roles} initialAccessMap={accessMap} allSections={ALL_SECTIONS} sectionLabels={SECTION_LABELS} />
        </>
      )}
    </div>
  );
}
