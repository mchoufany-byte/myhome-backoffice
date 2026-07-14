"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export function EditPropertyForm({
  property,
  clients,
  onDone,
}: {
  property: Property;
  clients: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const address = (form.elements.namedItem("address") as HTMLInputElement).value;
    const nickname = (form.elements.namedItem("nickname") as HTMLInputElement).value || null;
    const client_id = (form.elements.namedItem("client_id") as HTMLSelectElement).value || null;
    const zone = (form.elements.namedItem("zone") as HTMLSelectElement).value || null;
    const plan_tier = (form.elements.namedItem("plan_tier") as HTMLSelectElement).value;
    const status = (form.elements.namedItem("status") as HTMLSelectElement).value;
    const key_custody = (form.elements.namedItem("key_custody") as HTMLSelectElement).value || null;

    if (!address) {
      setError("Address is required.");
      return;
    }
    if (!client_id) {
      setError("A client is required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("properties")
      .update({ address, nickname, client_id, zone, plan_tier, status, key_custody })
      .eq("id", property.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3 mb-8">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Address</label>
          <input
            name="address"
            required
            defaultValue={property.address}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Nickname</label>
          <input
            name="nickname"
            defaultValue={property.nickname ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Client</label>
          <select
            name="client_id"
            defaultValue={property.client_id ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          >
            <option value="">Select...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Zone</label>
          <select
            name="zone"
            defaultValue={property.zone ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="Beirut">Beirut</option>
            <option value="Mount Lebanon">Mount Lebanon</option>
            <option value="North Lebanon">North Lebanon</option>
            <option value="South Lebanon">South Lebanon</option>
            <option value="Beqaa">Beqaa</option>
            <option value="Nabatieh">Nabatieh</option>
            <option value="Akkar">Akkar</option>
            <option value="Baalbek-Hermel">Baalbek-Hermel</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Plan Tier (Package)</label>
          <select
            name="plan_tier"
            defaultValue={property.plan_tier ?? "Standard"}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          >
            <option value="Basic">Basic</option>
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
            <option value="Signature">Signature</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Status</label>
          <select
            name="status"
            defaultValue={property.status ?? "active"}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="paused">Paused</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Key Custody</label>
          <select
            name="key_custody"
            defaultValue={property.key_custody ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          >
            <option value="">Not set</option>
            <option value="company_held">Company Held</option>
            <option value="client_held">Client Held</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-green text-parchment text-sm font-medium py-2 px-4 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-ink/60 font-medium py-2 px-4 border border-line">
          Discard Changes
        </button>
      </div>
    </form>
  );
}
