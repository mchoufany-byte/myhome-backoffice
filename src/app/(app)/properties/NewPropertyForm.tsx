"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";

export function NewPropertyForm({
  clients,
  currentStaff,
}: {
  clients: { id: string; name: string }[];
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const address = (form.elements.namedItem("address") as HTMLInputElement).value;
    const nickname = (form.elements.namedItem("nickname") as HTMLInputElement).value || null;
    const client_id = (form.elements.namedItem("client_id") as HTMLSelectElement).value || null;
    const zone = (form.elements.namedItem("zone") as HTMLInputElement).value || null;
    const plan_tier = (form.elements.namedItem("plan_tier") as HTMLInputElement).value || null;
    const status = (form.elements.namedItem("status") as HTMLInputElement).value || null;
    const key_custody = (form.elements.namedItem("key_custody") as HTMLInputElement).value || null;

    if (!address) {
      setError("Address is required.");
      return;
    }
    if (!client_id) {
      setError("A client is required -- every property must belong to one. Add the client first on the Clients page if they're not listed.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("properties").insert({
      address,
      nickname,
      client_id,
      zone,
      plan_tier,
      status,
      key_custody,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    await logAudit(supabase, currentStaff, "create", "properties", null, `Created ${nickname || address}`);

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Address</label>
        <input name="address" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Nickname</label>
        <input name="nickname" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Client</label>
        <select name="client_id" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
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
        <select name="zone" defaultValue="" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
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
        <label className="block text-xs text-ink/60 mb-1">Plan Tier</label>
        <select
          name="plan_tier"
          defaultValue="Standard"
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
        <select name="status" defaultValue="active" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="paused">Paused</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Key Custody</label>
        <select name="key_custody" defaultValue="" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="">Not set</option>
          <option value="company_held">Company Held</option>
          <option value="client_held">Client Held</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Property"}
        </button>
        <button
          type="reset"
          onClick={() => setError(null)}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
      <p className="text-[11px] text-ink/50">
        Zone/Plan/Status/Key Custody are free-typed with suggestions -- if the database rejects a value with a
        constraint error, it'll show above and I'll pin the form to the exact allowed list.
      </p>
    </form>
  );
}
