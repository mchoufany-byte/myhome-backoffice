"use client";

import { useMemo, useState } from "react";

export type LedgerType =
  | "invoice"
  | "bill"
  | "float_topup"
  | "float_draw"
  | "renewal_fee"
  | "maintenance_fee"
  | "arrival_fee";

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
