"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

type ServiceOrder = {
  id: string;
  description: string;
  price: number;
  quantity: number;
  status: "pending" | "fulfilled" | "cancelled";
  fee_invoiced: boolean;
  ordered_at: string;
  notes: string | null;
  clients?: { name: string; client_type: string | null; company_name: string | null } | null;
  properties?: { nickname: string | null; address: string } | null;
};

function clientLabel(c: ServiceOrder["clients"]) {
  if (!c) return "—";
  return c.client_type === "company" && c.company_name ? c.company_name : c.name;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ServiceOrderRow({
  order,
  currentStaff,
}: {
  order: ServiceOrder;
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = Number(order.price) * order.quantity;

  async function updateStatus(status: "fulfilled" | "cancelled") {
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const patch: Record<string, unknown> = { status };
    if (status === "fulfilled") patch.fulfilled_at = new Date().toISOString();
    const { error: updateError } = await supabase.from("service_orders").update(patch).eq("id", order.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAudit(
      supabase,
      currentStaff,
      status === "fulfilled" ? "fulfill" : "cancel",
      "service_orders",
      order.id,
      status === "fulfilled" ? `Fulfilled ${order.description}` : `Cancelled ${order.description}`
    );
    router.refresh();
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{order.description}</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {clientLabel(order.clients)}
            {order.properties ? ` · ${order.properties.nickname || order.properties.address}` : ""} ·{" "}
            {fmtDate(order.ordered_at)}
            {order.quantity > 1 ? ` · x${order.quantity}` : ""}
          </p>
          {order.notes && <p className="text-xs text-ink/60 mt-1">{order.notes}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium text-ink">${total.toFixed(2)}</p>
          {order.status === "fulfilled" && (
            <p className={`text-xs mt-0.5 ${order.fee_invoiced ? "text-green" : "text-gold"}`}>
              {order.fee_invoiced ? "Invoiced" : "Pending invoice"}
            </p>
          )}
          {order.status === "cancelled" && <p className="text-xs text-ink/40 mt-0.5">Cancelled</p>}
        </div>
      </div>

      {order.status === "pending" && (
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => updateStatus("fulfilled")}
            disabled={saving}
            className="text-xs text-green font-medium hover:underline disabled:opacity-60"
          >
            Mark Fulfilled
          </button>
          <button
            onClick={() => updateStatus("cancelled")}
            disabled={saving}
            className="text-xs text-red font-medium hover:underline disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red mt-1.5">{error}</p>}
    </div>
  );
}
