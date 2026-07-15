// Shared helpers for date inputs that shouldn't accept a day that's already
// passed (visit scheduling, renewal/invoice due dates, key expected-return).
// The `min` attribute stops most manual typing/picking, but browsers don't
// enforce it consistently, so callers should also re-check in their submit
// handler before writing to the DB.

// Today as "YYYY-MM-DD" in the browser's local timezone.
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// True if the given "YYYY-MM-DD" string is strictly before today.
export function isPastDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return dateStr < todayStr();
}

// "now" as "YYYY-MM-DDTHH:mm" for datetime-local inputs.
export function nowLocalStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

// True if the given "YYYY-MM-DDTHH:mm"-style datetime-local string is
// strictly before now.
export function isPastDateTime(dateTimeStr: string | null | undefined): boolean {
  if (!dateTimeStr) return false;
  const t = new Date(dateTimeStr).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}
