"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NewClientForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientType, setClientType] = useState<"individual" | "company">("individual");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value || null;
    const secondary_email = (form.elements.namedItem("secondary_email") as HTMLInputElement).value || null;
    const secondary_phone = (form.elements.namedItem("secondary_phone") as HTMLInputElement).value || null;
    const preferred_language = (form.elements.namedItem("preferred_language") as HTMLSelectElement).value || null;
    const contact_person_name = (form.elements.namedItem("contact_person_name") as HTMLInputElement).value || null;
    const contact_person_phone = (form.elements.namedItem("contact_person_phone") as HTMLInputElement).value || null;
    const contact_person_relationship =
      (form.elements.namedItem("contact_person_relationship") as HTMLInputElement).value || null;
    const emergency_contact_name =
      (form.elements.namedItem("emergency_contact_name") as HTMLInputElement).value || null;
    const emergency_contact_phone =
      (form.elements.namedItem("emergency_contact_phone") as HTMLInputElement).value || null;
    const emergency_contact_relationship =
      (form.elements.namedItem("emergency_contact_relationship") as HTMLInputElement).value || null;
    const notes = (form.elements.namedItem("notes") as HTMLTextAreaElement).value || null;
    const company_name =
      clientType === "company" ? (form.elements.namedItem("company_name") as HTMLInputElement).value || null : null;
    const cr_number =
      clientType === "company" ? (form.elements.namedItem("cr_number") as HTMLInputElement).value || null : null;
    const tax_number =
      clientType === "company" ? (form.elements.namedItem("tax_number") as HTMLInputElement).value || null : null;

    if (!name || !email) {
      setError("Name and email are required.");
      return;
    }
    if (clientType === "company" && !company_name) {
      setError("Company name is required for company clients.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error: insertError } = await supabase.from("clients").insert({
      name,
      email,
      phone,
      secondary_email,
      secondary_phone,
      preferred_language,
      contact_person_name,
      contact_person_phone,
      contact_person_relationship,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      notes,
      client_type: clientType,
      company_name,
      cr_number,
      tax_number,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    formRef.current?.reset();
    setClientType("individual");
    router.refresh();
  }

  function handleClear() {
    formRef.current?.reset();
    setClientType("individual");
    setError(null);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Client Type</label>
        <div className="flex gap-4 text-sm text-ink py-1">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="client_type_toggle"
              checked={clientType === "individual"}
              onChange={() => setClientType("individual")}
            />
            Individual
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="client_type_toggle"
              checked={clientType === "company"}
              onChange={() => setClientType("company")}
            />
            Company
          </label>
        </div>
      </div>

      {clientType === "company" && (
        <div>
          <label className="block text-xs text-ink/60 mb-1">Company Name</label>
          <input name="company_name" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
        </div>
      )}

      <div>
        <label className="block text-xs text-ink/60 mb-1">{clientType === "company" ? "Signatory Name" : "Name"}</label>
        <input name="name" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Email</label>
        <input name="email" type="email" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Phone</label>
        <input name="phone" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Secondary Email</label>
        <input name="secondary_email" type="email" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Secondary Phone</label>
        <input name="secondary_phone" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Preferred Language</label>
        <select name="preferred_language" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="">Not set</option>
          <option value="EN">English</option>
          <option value="FR">French</option>
          <option value="AR">Arabic</option>
        </select>
      </div>

      {clientType === "company" && (
        <>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold pt-2">Company Registration</p>
          <div>
            <label className="block text-xs text-ink/60 mb-1">CR Number</label>
            <input name="cr_number" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-ink/60 mb-1">Financial/Tax Number</label>
            <input name="tax_number" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
          </div>
        </>
      )}

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold pt-2">
        {clientType === "company" ? "Company Contact (optional)" : "Contact Person (optional)"}
      </p>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Name</label>
        <input name="contact_person_name" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Phone</label>
        <input name="contact_person_phone" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Relationship</label>
        <input
          name="contact_person_relationship"
          placeholder={clientType === "company" ? "e.g. Office Manager, Assistant" : "e.g. Spouse, Assistant, Property Manager"}
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold pt-2">Emergency Contact (optional)</p>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Name</label>
        <input name="emergency_contact_name" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Phone</label>
        <input name="emergency_contact_phone" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Relationship</label>
        <input
          name="emergency_contact_relationship"
          placeholder="e.g. Sibling, Parent, Friend"
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs text-ink/60 mb-1">Notes / Feedback</label>
        <textarea name="notes" rows={3} className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Client"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
      <p className="text-[11px] text-ink/50">
        This creates their record so you can attach a property right away. They'll get full app access once they
        sign up in My Home with this same email -- link their login to this record in Supabase after that (auth_id
        column).
      </p>
    </form>
  );
}
