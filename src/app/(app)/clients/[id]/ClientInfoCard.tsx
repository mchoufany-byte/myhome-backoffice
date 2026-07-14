"use client";

import { useState } from "react";
import { EditClientForm } from "./EditClientForm";

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  secondary_email: string | null;
  secondary_phone: string | null;
  preferred_language: string | null;
  payment_method_type: string | null;
  contact_person_name: string | null;
  contact_person_phone: string | null;
  contact_person_relationship: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  notes: string | null;
  photo_url: string | null;
  client_type: string | null;
  company_name: string | null;
  cr_number: string | null;
  tax_number: string | null;
};

const LANGUAGE_LABEL: Record<string, string> = { EN: "English", FR: "French", AR: "Arabic" };

export function ClientInfoCard({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <EditClientForm client={client} onDone={() => setEditing(false)} />;
  }

  const isCompany = client.client_type === "company";

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">
          Details {isCompany && <span className="text-ink/40 normal-case">&middot; Company</span>}
        </p>
        <button onClick={() => setEditing(true)} className="text-xs text-green font-medium hover:underline">
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isCompany && (
          <div className="bg-surface border border-line p-4 col-span-2">
            <p className="text-xs text-ink/50 uppercase tracking-wide">Company Name</p>
            <p className="text-sm text-ink mt-1">{client.company_name ?? "—"}</p>
          </div>
        )}
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Email</p>
          <p className="text-sm text-ink mt-1">{client.email}</p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Phone</p>
          <p className="text-sm text-ink mt-1">{client.phone ?? "—"}</p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Preferred Language</p>
          <p className="text-sm text-ink mt-1">
            {client.preferred_language ? LANGUAGE_LABEL[client.preferred_language] ?? client.preferred_language : "—"}
          </p>
        </div>
        <div className="bg-surface border border-line p-4">
          <p className="text-xs text-ink/50 uppercase tracking-wide">Payment Method</p>
          <p className="text-sm text-ink mt-1 capitalize">{client.payment_method_type ?? "Not set"}</p>
        </div>

        {isCompany && (client.cr_number || client.tax_number) && (
          <div className="bg-surface border border-line p-4 col-span-2">
            <p className="text-xs text-ink/50 uppercase tracking-wide">Registration</p>
            <p className="text-sm text-ink mt-1">
              {client.cr_number ? `CR ${client.cr_number}` : ""}
              {client.cr_number && client.tax_number ? " · " : ""}
              {client.tax_number ? `Tax No. ${client.tax_number}` : ""}
            </p>
          </div>
        )}

        {(client.contact_person_name || client.contact_person_phone) && (
          <div className="bg-surface border border-line p-4 col-span-2">
            <p className="text-xs text-ink/50 uppercase tracking-wide">
              {isCompany ? "Company Contact" : "Contact Person"}
            </p>
            <p className="text-sm text-ink mt-1">
              {client.contact_person_name ?? "—"}
              {client.contact_person_relationship ? ` · ${client.contact_person_relationship}` : ""}
              {client.contact_person_phone ? ` · ${client.contact_person_phone}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
