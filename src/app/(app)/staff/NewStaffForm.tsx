"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RoleDef } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export function NewStaffForm({
  roles,
  currentStaff,
}: {
  roles: RoleDef[];
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
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value || null;
    const role = (form.elements.namedItem("role") as HTMLSelectElement).value;
    const job_title = (form.elements.namedItem("job_title") as HTMLInputElement).value || null;

    if (!name || !email || !role) {
      setError("Name, email, and role are required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("staff").insert({
      name,
      email,
      phone,
      role,
      job_title,
      is_active: true,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    await logAudit(supabase, currentStaff, "create", "staff", null, `Created ${name}`);

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Name</label>
        <input name="name" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Email</label>
        <input name="email" type="email" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
        <p className="text-[10px] text-ink/40 mt-1">Must match the email of their Supabase Auth login.</p>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Phone</label>
        <input name="phone" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Job Title</label>
        <input
          name="job_title"
          placeholder="e.g. Operations Manager, Zone Lead"
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Role</label>
        <select name="role" required defaultValue="" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="" disabled>
            Select...
          </option>
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Staff"}
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
        This creates their staff record so roles/assignments work, but they can't sign in yet -- create their login
        in Supabase Auth (Authentication &rarr; Users) with this same email, then link it by running:{" "}
        <code className="bg-surfaceAlt px-1">update staff set auth_id = &apos;&lt;their auth uid&gt;&apos; where email = &apos;...&apos;;</code>
      </p>
    </form>
  );
}
