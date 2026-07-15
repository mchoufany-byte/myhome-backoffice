"use client";

import { useMemo, useState } from "react";

export type LedgerType =
  | "invoice"
  | "bill"
  | "float_topup"
  | "float_draw"
  | "renewal_fee"
  | "maintenance_fee"
  | "arrival_fee"
  | "service_fee";

export type LedgerEntry = {
  id: string;
  clientId: string | null;
  date: string | null;
  type: LedgerType;
  label: string;
  detail: string;
  amount: number;
  status: string;
  href?: string;
};

const TYPE_LABEL: Record<LedgerType, string> = {
  invoice: "Invoice",
  bill: "Utility Bill",
  float_topup: "Float Top-Up",
  float_draw: "Float Draw",
  renewal_fee: "Renewal Fee",
  maintenance_fee: "Maintenance Fee",
  arrival_fee: "Arrival Fee",
  service_fee: "Service Order",
};

const ALL_TYPES = Object.keys(TYPE_LABEL) as LedgerType[];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusColor(status: string) {
  if (status === "Pending invoice" || status === "Due") return "text-gold";
  if (status.startsWith("Invoiced") || status.startsWith("Paid") || status === "Deposited") return "text-green";
  return "text-ink/60";
}

function monthLabel(ym: string) {
  if (ym === "—") return "No date";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

// Buckets each entry into Advance (float deposits), Paid (money settled), or
// Due (still owed/outstanding) for the monthly summary. Renewal/maintenance/
// arrival fees that have already been folded into an invoice are skipped
// here -- their value is already counted once, inside that invoice's own
// entry, so counting the fee separately would double it.
function bucketOf(e: LedgerEntry): "advance" | "paid" | "due" | null {
  switch (e.type) {
    case "float_topup":
      return "advance";
    case "float_draw":
      return "paid";
    case "invoice":
      if (e.status === "paid") return "paid";
      if (e.status === "void") return null;
      return "due";
    case "bill":
      return e.status.startsWith("Paid") ? "paid" : "due";
    case "renewal_fee":
    case "maintenance_fee":
    case "arrival_fee":
    case "service_fee":
      return e.status === "Invoiced" ? null : "due";
    default:
      return null;
  }
}

export function LedgerView({
  entries,
  clients,
}: {
  entries: LedgerEntry[];
  clients: { id: string; label: string }[];
}) {
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [types, setTypes] = useState<Set<LedgerType>>(new Set(ALL_TYPES));

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.label])), [clients]);

  function toggleType(t: LedgerType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (clientId && e.clientId !== clientId) return false;
      if (!types.has(e.type)) return false;
      if (from && (!e.date || e.date.slice(0, 10) < from)) return false;
      if (to && (!e.date || e.date.slice(0, 10) > to)) return false;
      return true;
    });
  }, [entries, clientId, from, to, types]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const pendingCount = filtered.filter((e) => e.status === "Pending invoice" || e.status === "Due").length;

  const monthly = useMemo(() => {
    const rows = new Map<string, { advance: number; paid: number; due: number }>();
    for (const e of filtered) {
      const bucket = bucketOf(e);
      if (!bucket) continue;
      const ym = e.date ? e.date.slice(0, 7) : "—";
      if (!rows.has(ym)) rows.set(ym, { advance: 0, paid: 0, due: 0 });
      rows.get(ym)![bucket] += e.amount;
    }
    return [...rows.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div>
      <div className="bg-surface border border-line p-4 mb-6 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-ink/60 mb-1">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink/60 mb-1.5">Type</label>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {ALL_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-xs text-ink/80 cursor-pointer">
                <input type="checkbox" checked={types.has(t)} onChange={() => toggleType(t)} />
                {TYPE_LABEL[t]}
              </label>
            ))}
          </div>
        </div>
      </div>

      {monthly.length > 0 && (
        <div className="bg-surface border border-line mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-gold">Month</th>
                <th className="px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-gold text-right">
                  Advance Payments
                </th>
                <th className="px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-gold text-right">
                  Paid
                </th>
                <th className="px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-gold text-right">
                  Due
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {monthly.map(([ym, row]) => (
                <tr key={ym}>
                  <td className="px-4 py-2.5 text-ink">{monthLabel(ym)}</td>
                  <td className="px-4 py-2.5 text-right text-ink/80">
                    {row.advance ? `$${row.advance.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-green">{row.paid ? `$${row.paid.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-gold">{row.due ? `$${row.due.toFixed(2)}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-[10.5px] text-ink/40 border-t border-line">
            Renewal/maintenance/arrival fees already folded into an invoice aren't counted separately here — they're
            included in that invoice's Paid/Due figure instead.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-ink/60">
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} · ${total.toFixed(2)} total
          {pendingCount > 0 && <span className="text-gold"> · {pendingCount} pending invoice</span>}
        </p>
      </div>

      <div className="bg-surface border border-line divide-y divide-line">
        {filtered.map((e) => {
          const clientName = e.clientId ? clientNameById.get(e.clientId) ?? "—" : "—";
          const row = (
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{e.label}</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  {clientName}
                  {e.detail ? ` · ${e.detail}` : ""} · {fmtDate(e.date)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-ink">${e.amount.toFixed(2)}</p>
                <p className={`text-xs mt-0.5 ${statusColor(e.status)}`}>{e.status}</p>
              </div>
            </div>
          );
          return e.href ? (
            <a key={e.id} href={e.href} className="block hover:bg-parchmentAlt transition-colors">
              {row}
            </a>
          ) : (
            <div key={e.id}>{row}</div>
          );
        })}
        {!filtered.length && <p className="px-4 py-6 text-sm text-ink/50">No entries match these filters.</p>}
      </div>
    </div>
  );
}
