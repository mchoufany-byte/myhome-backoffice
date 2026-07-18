"use client";

import { useMemo, useState } from "react";

export type CashEntry = {
  id: string;
  date: string;
  type: "collection" | "expense";
  label: string;
  detail: string;
  amount: number;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CashLedger({ entries }: { entries: CashEntry[] }) {
  const [type, setType] = useState<"all" | "collection" | "expense">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Running balance is computed chronologically (oldest first) regardless of
  // filters, so the balance shown always reflects the building's real cash
  // position at that point in time -- then the filtered/sorted-desc list is
  // built from those already-stamped entries.
  const withBalance = useMemo(() => {
    const chrono = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    return chrono.map((e) => {
      balance += e.type === "collection" ? e.amount : -e.amount;
      return { ...e, balance };
    });
  }, [entries]);

  const filtered = useMemo(() => {
    return withBalance
      .filter((e) => {
        if (type !== "all" && e.type !== type) return false;
        if (from && e.date.slice(0, 10) < from) return false;
        if (to && e.date.slice(0, 10) > to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [withBalance, type, from, to]);

  const currentBalance = withBalance.length ? withBalance[withBalance.length - 1].balance : 0;

  return (
    <div>
      <div className="bg-surface border border-line p-4 mb-4">
        <p className="text-[10px] text-ink/50 uppercase tracking-wide">Current Cash Balance</p>
        <p className={`text-2xl font-serif mt-1 ${currentBalance < 0 ? "text-red" : "text-green"}`}>
          ${currentBalance.toFixed(2)}
        </p>
      </div>

      <div className="bg-surface border border-line p-3 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] text-ink/50 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="border border-line bg-parchment px-2 py-1.5 text-xs"
          >
            <option value="all">All</option>
            <option value="collection">Collections</option>
            <option value="expense">Expenses</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-ink/50 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-line bg-parchment px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] text-ink/50 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-line bg-parchment px-2 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="bg-surface border border-line divide-y divide-line">
        {filtered.map((e) => (
          <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-ink truncate">{e.label}</p>
              <p className="text-xs text-ink/50 mt-0.5">
                {e.detail ? `${e.detail} · ` : ""}
                {fmtDate(e.date)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-medium ${e.type === "collection" ? "text-green" : "text-red"}`}>
                {e.type === "collection" ? "+" : "−"}${e.amount.toFixed(2)}
              </p>
              <p className="text-[10px] text-ink/40 mt-0.5">Bal ${e.balance.toFixed(2)}</p>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="px-4 py-6 text-sm text-ink/50">No entries match these filters.</p>}
      </div>
    </div>
  );
}
