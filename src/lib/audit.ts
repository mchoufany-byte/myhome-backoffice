// Lightweight audit trail for high-risk actions (deletes, staff status
// changes, invoice mark-paid/void/generate). Not exhaustive -- deliberately
// scoped to actions where "who did this and when" actually matters, rather
// than instrumenting every mutation in the app.

type SupabaseLike = {
  from: (table: string) => any;
};

export async function logAudit(
  supabase: SupabaseLike,
  actor: { id: string; name: string } | null | undefined,
  action: string,
  tableName: string,
  recordId: string | null,
  detail?: string | null
) {
  try {
    await supabase.from("audit_log").insert({
      staff_id: actor?.id ?? null,
      staff_name: actor?.name ?? null,
      action,
      table_name: tableName,
      record_id: recordId,
      detail: detail ?? null,
    });
  } catch {
    // Audit logging should never take down the actual action it's logging.
  }
}
