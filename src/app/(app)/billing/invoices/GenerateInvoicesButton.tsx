"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateMonthlyInvoices } from "./actions";

export function GenerateInvoicesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const { createdCount, period, skippedAlreadyInvoiced } = await generateMonthlyInvoices();
        setResult(
          createdCount
            ? `Created ${createdCount} invoice${createdCount === 1 ? "" : "s"} for ${period}${
                skippedAlreadyInvoiced ? ` (${skippedAlreadyInvoiced} client${skippedAlreadyInvoiced === 1 ? "" : "s"} already had one)` : ""
              }.`
            : `Nothing to bill for ${period} — every client already has an invoice, or there's nothing to charge.`
        );
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="bg-surface border border-line p-4 mb-6">
      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-2">Recurring Billing</p>
      <p className="text-xs text-ink/60 mb-3">
        Generates this month's package-fee invoices, plus any completed maintenance coordination, arrival concierge, or
        renewal fees not yet billed. Safe to click more than once — it skips clients already invoiced this period.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="bg-green text-parchment text-sm font-medium px-4 py-2.5 disabled:opacity-60"
      >
        {isPending ? "Generating..." : "Generate This Month's Invoices"}
      </button>
      {result && <p className="text-xs text-green mt-2">{result}</p>}
      {error && <p className="text-xs text-red mt-2">{error}</p>}
    </div>
  );
}
