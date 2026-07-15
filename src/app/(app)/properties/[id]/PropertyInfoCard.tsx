"use client";

import { useState } from "react";
import Link from "next/link";
import { EditPropertyForm } from "./EditPropertyForm";

type Property = {
  id: string;
  nickname: string | null;
  address: string;
  zone: string | null;
  plan_tier: string | null;
  status: string | null;
  key_custody: string | null;
  client_id: string | null;
};

export function PropertyInfoCard({
  property,
  clients,
  clientName,
  floatBalance,
  currentStaff,
}: {
  property: Property;
  clients: { id: string; name: string }[];
  clientName: string | null;
  floatBalance: number | null;
  currentStaff?: { id: string; name: string };
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditPropertyForm
        property={property}
        clients={clients}
        onDone={() => setEditing(false)}
        currentStaff={currentStaff}
      />
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Details</p>
        <button onClick={() => setEditing(true)} className="text-xs text-green font-medium hover:underline">
          Edit / Upgrade Package
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Client</p>
          {property.client_id && clientName ? (
            <Link href={`/clients/${property.client_id}`} className="text-sm text-green font-medium mt-1 block">
              {clientName}
            </Link>
          ) : (
            <p className="text-sm text-ink mt-1">—</p>
          )}
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Plan Tier</p>
          <p className="text-sm text-ink mt-1 capitalize">{property.plan_tier ?? "—"}</p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Zone</p>
          <p className="text-sm text-ink mt-1 capitalize">{property.zone ?? "—"}</p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Key Custody</p>
          <p className="text-sm text-ink mt-1 capitalize">
            {property.key_custody ? property.key_custody.replace("_", " ") : "—"}
          </p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Status</p>
          <p className="text-sm text-ink mt-1 capitalize">{property.status ?? "active"}</p>
        </div>
        {floatBalance !== null && (
          <div className="bg-surface border border-line p-4 col-span-2">
            <p className="text-xs text-ink/50 uppercase tracking-wide">Utility Float Balance</p>
            <p className="text-sm text-ink mt-1">${floatBalance.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
