import Link from "next/link";
import { requireSection } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { getRoles, getAccessMap, ALL_SECTIONS, SECTION_LABELS } from "@/lib/roles";
import { updateStaffRole, setStaffActive } from "./actions";
import { NewStaffForm } from "./NewStaffForm";

export default async function StaffPage() {
  await requireSection("staff");
  const supabase = createClient();

  const [{ data: staffList }, roles, accessMap] = await Promise.all([
    supabase
      .from("staff")
      .select("id, name, role, email, phone, availability, job_title, is_active")
      .order("name", { ascending: true }),
    getRoles(supabase),
    getAccessMap(supabase),
  ]);

  const roleKeys = roles.map((r) => r.key);

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Team</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Staff</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-surface border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Access</th>
                </tr>
              </thead>
              <tbody>
                {staffList?.map((s) => {
                  const active = s.is_active !== false;
                  return (
                    <tr key={s.id} className={`border-b border-line last:border-0 hover:bg-surfaceAlt ${!active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{s.name}</p>
                        {s.job_title && <p className="text-xs text-ink/50 mt-0.5">{s.job_title}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <form action={updateStaffRole} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={s.id} />
                          <select
                            name="role"
                            defaultValue={roleKeys.includes(s.role) ? s.role : ""}
                            className="border border-line bg-parchment text-xs px-2 py-1.5"
                          >
                            {!roleKeys.includes(s.role) && <option value={s.role}>{s.role} (unmapped)</option>}
                            {roles.map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="text-xs text-green font-medium hover:underline">
                            Save
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3 text-ink/80">
                        <p>{s.email ?? "—"}</p>
                        <p className="text-xs text-ink/50 mt-0.5">{s.phone ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <form action={setStaffActive} className="flex flex-col items-start gap-1.5">
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="is_active" value={(!active).toString()} />
                          <span className={`text-[10px] px-2 py-1 border uppercase tracking-wide whitespace-nowrap ${active ? "border-line text-ink/60" : "border-red text-red"}`}>
                            {active ? "Active" : "Deactivated"}
                          </span>
                          <button type="submit" className="text-xs text-ink/60 font-medium hover:underline whitespace-nowrap">
                            {active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!staffList?.length && <p className="p-6 text-sm text-ink/50">No staff on file yet.</p>}
          </div>

          <div className="flex items-center justify-between mb-3 mt-8">
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Role Permissions</p>
            <Link href="/staff/roles" className="text-xs text-green font-medium hover:underline">
              Manage Roles &rarr;
            </Link>
          </div>
          <div className="bg-surface border border-line overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide">Section</th>
                  {roles.map((r) => (
                    <th
                      key={r.key}
                      className="px-3 py-3 font-medium text-ink/60 text-xs uppercase tracking-wide text-center whitespace-nowrap"
                    >
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_SECTIONS.map((section) => (
                  <tr key={section} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-ink font-medium whitespace-nowrap">{SECTION_LABELS[section]}</td>
                    {roles.map((r) => (
                      <td key={r.key} className="px-3 py-2.5 text-center">
                        {accessMap[r.key]?.includes(section) ? (
                          <span className="text-green">&#10003;</span>
                        ) : (
                          <span className="text-ink/20">&mdash;</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">New Staff</p>
          <NewStaffForm roles={roles} />
        </div>
      </div>
    </div>
  );
}
