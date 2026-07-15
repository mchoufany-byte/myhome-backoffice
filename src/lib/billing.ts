// Due dates must be derived from the billing period itself, not from "today"
// at the moment an invoice happens to be created. Otherwise two invoices for
// the exact same period (e.g. one entered by hand on the 3rd, another
// bulk-generated on the 14th) end up with different due dates purely because
// of when someone clicked the button -- which is the "dates aren't the same"
// bug this fixes.
//
// Rule: due date = the 16th of the billing period's month (period start + 15
// days), so every invoice tagged with billing_period "2026-07" always gets
// the same due date, however and whenever it was created.
export function dueDateForPeriod(period: string | null | undefined): string {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-indexed

  const match = /^(\d{4})-(\d{2})$/.exec((period ?? "").trim());
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]) - 1;
  }

  const d = new Date(Date.UTC(year, month, 1));
  d.setUTCDate(d.getUTCDate() + 15);
  return d.toISOString().slice(0, 10);
}
