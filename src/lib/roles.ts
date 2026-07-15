// Sections are the fixed set of pages that actually exist in this app -- that
// part doesn't need to be dynamic. Which ROLES can see which sections used to
// be hardcoded here too, but now lives in the custom_roles / role_section_access
// tables so it's manageable from the Roles admin screen (Staff -> Manage Roles)
// instead of requiring a code change every time.

export type Section =
  | "dashboard"
  | "properties"
  | "clients"
  | "visits"
  | "maintenance"
  | "billing"
  | "staff"
  | "documents"
  | "emergency"
  | "arrival_concierge"
  | "renewals"
  | "services"
  | "analytics"
  | "audit_log";

export const ALL_SECTIONS: Section[] = [
  "dashboard",
  "properties",
  "clients",
  "visits",
  "maintenance",
  "billing",
  "staff",
  "documents",
  "emergency",
  "arrival_concierge",
  "renewals",
  "services",
  "analytics",
  "audit_log",
];

export const SECTION_LABELS: Record<Section, string> = {
  dashboard: "Dashboard",
  properties: "Properties",
  clients: "Clients",
  visits: "Visits",
  maintenance: "Maintenance",
  billing: "Billing & Float",
  staff: "Staff",
  documents: "Documents",
  emergency: "Emergency",
  arrival_concierge: "Arrival Concierge",
  renewals: "Renewals",
  services: "Services",
  analytics: "Analytics",
  audit_log: "Audit Log",
};

export type RoleDef = { key: string; label: string; is_system: boolean; can_delete: boolean };

// role_key -> list of sections it can see
export type AccessMap = Record<string, Section[]>;

type SupabaseLike = {
  from: (table: string) => any;
};

export async function getRoles(supabase: SupabaseLike): Promise<RoleDef[]> {
  const { data } = await supabase
    .from("custom_roles")
    .select("key, label, is_system, can_delete")
    .order("label", { ascending: true });
  return (data as RoleDef[]) ?? [];
}

export function canDeleteRole(roles: RoleDef[], role: string | null | undefined): boolean {
  if (!role) return false;
  return roles.find((r) => r.key === role)?.can_delete ?? false;
}

export async function getAccessMap(supabase: SupabaseLike): Promise<AccessMap> {
  const { data } = await supabase.from("role_section_access").select("role_key, section");
  const map: AccessMap = {};
  (data ?? []).forEach((row: { role_key: string; section: string }) => {
    (map[row.role_key] ??= []).push(row.section as Section);
  });
  return map;
}

export function canAccess(accessMap: AccessMap, role: string | null | undefined, section: Section): boolean {
  if (!role) return false;
  return accessMap[role]?.includes(section) ?? false;
}

export function roleLabel(roles: RoleDef[], role: string | null | undefined): string {
  if (!role) return "Unknown";
  return roles.find((r) => r.key === role)?.label ?? role;
}
