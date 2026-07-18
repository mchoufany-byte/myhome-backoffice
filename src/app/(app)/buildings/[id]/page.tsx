import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { UnitsPanel } from "./UnitsPanel";
import { ChargesPanel } from "./ChargesPanel";
import { ExpensesPanel } from "./ExpensesPanel";
import { CashLedger, type CashEntry } from "./CashLedger";

function clientLabel(c: any) {
  if (!c) return "—";
  return c.client_type === "company" && c.company_name ? c.company_name : c.name;
}

export default async function BuildingDetailPage({ params }: { params: { id: string } }) {
  const currentStaff = await requireSection("buildings");
  const supabase = createClient();

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, address, notes, client_id, clients(name, client_type, company_name)")
    .eq("id", params.id)
    .single();

  if (!building) notFound();

  const [{ data: units }, { data: charges }, { data: expenses }, { data: suppliers }] = await Promise.all([
    supabase
      .from("building_units")
      .select("id, unit_label, owner_name, contact_phone, common_charge_amount, is_active")
      .eq("building_id", params.id)
      .order("unit_label", { ascending: true }),
    supabase
      .from("building_charges")
      .select("id, unit_id, period, amount, status, due_date, paid_at, building_units(unit_label)")
      .eq("building_id", params.id)
      .order("period", { ascending: false }),
    supabase
      .from("building_expenses")
      .select("id, category, description, amount, expense_date, building_suppliers(name)")
      .eq("building_id", params.id)
      .order("expense_date", { ascending: false }),
    supabase.from("building_suppliers").select("key, name, category").eq("is_active", true).order("name", { ascending: true }),
  ]);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisPeriodCharges = (charges ?? []).filter((c) => c.period === period);
  const expected = thisPeriodCharges.reduce((s, c) => s + Number(c.amount), 0);
  const collected = thisPeriodCharges.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
  const outstandingCount = thisPeriodCharges.filter((c) => c.status === "due").length;

  const monthStart = `${period}-01`;
  const thisMonthExpenses = (expenses ?? []).filter((e) => e.expense_date >= monthStart);
  const expensesTotal = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const cashEntries: CashEntry[] = [
    ...(charges ?? [])
      .filter((c) => c.status === "paid" && c.paid_at)
      .map((c: any) => ({
        id: `charge-${c.id}`,
        date: c.paid_at as string,
        type: "collection" as const,
        label: `Common Charge — ${c.building_units?.unit_label ?? "—"}`,
        detail: c.period,
        amount: Number(c.amount),
      })),
    ...(expenses ?? []).map((e: any) => ({
      id: `expense-${e.id}`,
      date: e.expense_date as string,
      type: "expense" as const,
      label: `${e.category[0].toUpperCase()}${e.category.slice(1)} Expense`,
      detail: e.building_suppliers?.name ?? "",
      amount: Number(e.amount),
    })),
  ];

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/buildings" className="text-xs text-ink/50 hover:text-ink">
        &larr; Buildings
      </Link>
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold mt-3">Operations</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">{building.name}</h1>
      <p className="text-sm text-ink/60 mb-6">
        {clientLabel((building as any).clients)} · {building.address ?? "No address on file"}
      </p>

      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-surface border border-line p-3">
          <p className="text-[10px] text-ink/50 uppercase tracking-wide">Expected ({period})</p>
          <p className="text-lg font-serif text-ink mt-1">${expected.toFixed(2)}</p>
        </div>
        <div className="bg-surface border border-line p-3">
          <p className="text-[10px] text-ink/50 uppercase tracking-wide">Collected</p>
          <p className="text-lg font-serif text-green mt-1">${collected.toFixed(2)}</p>
        </div>
        <div className="bg-surface border border-line p-3">
          <p className="text-[10px] text-ink/50 uppercase tracking-wide">Flats Outstanding</p>
          <p className={`text-lg font-serif mt-1 ${outstandingCount > 0 ? "text-gold" : "text-ink"}`}>
            {outstandingCount}
          </p>
        </div>
        <div className="bg-surface border border-line p-3">
          <p className="text-[10px] text-ink/50 uppercase tracking-wide">Expenses ({period})</p>
          <p className="text-lg font-serif text-red mt-1">${expensesTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Flats</p>
          <UnitsPanel
            buildingId={building.id}
            units={(units ?? []) as any}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        </section>

        <section>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Common Charges</p>
          <ChargesPanel buildingId={building.id} charges={(charges ?? []) as any} />
        </section>

        <section>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
            Generator / Fuel / Other Expenses
          </p>
          <ExpensesPanel
            buildingId={building.id}
            expenses={(expenses ?? []) as any}
            suppliers={(suppliers ?? []) as any}
            currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
          />
        </section>

        <section>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Cash Ledger</p>
          <CashLedger entries={cashEntries} />
        </section>
      </div>
    </div>
  );
}
