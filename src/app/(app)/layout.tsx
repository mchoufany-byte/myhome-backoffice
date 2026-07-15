import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canAccess, getAccessMap, getRoles, roleLabel, type Section } from "@/lib/roles";
import { signOut } from "./actions";

const NAV_ITEMS: { href: string; label: string; section: Section }[] = [
  { href: "/", label: "Dashboard", section: "dashboard" },
  { href: "/properties", label: "Properties", section: "properties" },
  { href: "/clients", label: "Clients", section: "clients" },
  { href: "/visits", label: "Visits", section: "visits" },
  { href: "/maintenance", label: "Maintenance", section: "maintenance" },
  { href: "/emergency", label: "Emergency", section: "emergency" },
  { href: "/arrival-concierge", label: "Arrival Concierge", section: "arrival_concierge" },
  { href: "/renewals", label: "Renewals", section: "renewals" },
  { href: "/services", label: "Services", section: "services" },
  { href: "/billing", label: "Billing & Float", section: "billing" },
  { href: "/documents", label: "Documents", section: "documents" },
  { href: "/staff", label: "Staff", section: "staff" },
  { href: "/analytics", label: "Analytics", section: "analytics" },
  { href: "/audit-log", label: "Audit Log", section: "audit_log" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const supabase = createClient();
  const [accessMap, roles] = await Promise.all([getAccessMap(supabase), getRoles(supabase)]);
  const visibleNav = NAV_ITEMS.filter((item) => canAccess(accessMap, staff.role, item.section));

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 shrink-0 bg-surface border-r border-line flex flex-col print:hidden">
        <div className="px-5 py-6 border-b border-line">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-gold">Gardien du Levant</p>
          <p className="text-base font-serif text-green mt-0.5">My Home</p>
        </div>

        <nav className="flex-1 py-4">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-5 py-2.5 text-sm text-ink/80 hover:bg-surfaceAlt hover:text-ink transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-line">
          <p className="text-sm font-medium text-ink">{staff.name}</p>
          <p className="text-xs text-ink/60 mb-3">{roleLabel(roles, staff.role)}</p>
          <form action={signOut}>
            <button type="submit" className="text-xs text-ink/60 hover:text-red transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
