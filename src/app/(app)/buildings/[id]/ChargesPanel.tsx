import { generateCommonCharges, markChargePaid } from "../actions";

type Charge = {
  id: string;
  period: string;
  amount: number;
  status: "due" | "paid";
  due_date: string | null;
  paid_at: string | null;
  building_units?: { unit_label: string } | null;
};

function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ChargesPanel({ buildingId, charges }: { buildingId: string; charges: Charge[] }) {
  const due = charges.filter((c) => c.status === "due");
  const paid = charges.filter((c) => c.status === "paid").slice(0, 15);

  return (
    <div>
      <form action={generateCommonCharges} className="mb-4">
        <input type="hidden" name="building_id" value={buildingId} />
        <button type="submit" className="text-xs bg-green text-parchment font-medium px-3 py-2">
          Generate This Month's Common Charges
        </button>
        <p className="text-[10.5px] text-ink/40 mt-1.5">
          Safe to click more than once — flats that already have a charge for this month are skipped.
        </p>
      </form>

      <div className="bg-surface border border-line divide-y divide-line mb-4">
        {due.map((c) => (
          <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">{c.building_units?.unit_label ?? "—"}</p>
              <p className="text-xs text-ink/50 mt-0.5">
                {c.period} · ${Number(c.amount).toFixed(2)}
                {c.due_date ? ` · Due ${shortDate(c.due_date)}` : ""}
              </p>
            </div>
            <form action={markChargePaid}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="building_id" value={buildingId} />
              <button type="submit" className="text-xs text-green font-medium hover:underline whitespace-nowrap">
                Mark Paid
              </button>
            </form>
          </div>
        ))}
        {!due.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing due.</p>}
      </div>

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-2">Recently Paid</p>
      <div className="bg-surface border border-line divide-y divide-line">
        {paid.map((c) => (
          <div key={c.id} className="px-4 py-2.5 flex items-center justify-between">
            <p className="text-sm text-ink">
              {c.building_units?.unit_label ?? "—"} <span className="text-xs text-ink/50">· {c.period}</span>
            </p>
            <p className="text-sm text-ink/70">${Number(c.amount).toFixed(2)}</p>
          </div>
        ))}
        {!paid.length && <p className="px-4 py-4 text-sm text-ink/50">No paid charges yet.</p>}
      </div>
    </div>
  );
}
