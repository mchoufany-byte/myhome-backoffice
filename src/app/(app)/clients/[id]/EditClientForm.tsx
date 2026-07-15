"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PhoneField } from "@/components/PhoneField";
import { logAudit } from "@/lib/audit";

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  secondary_email: string | null;
  secondary_phone: string | null;
  preferred_language: string | null;
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

export function EditClientForm({
  client,
  onDone,
  currentStaff,
}: {
  client: Client;
  onDone: () => void;
  currentStaff?: { id: string; name: string };
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(client.photo_url);
  const [error, setError] = useState<string | null>(null);
  const [clientType, setClientType] = useState<"individual" | "company">(
    client.client_type === "company" ? "company" : "individual"
  );

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingPhoto(true);

    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${client.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("client-photos").upload(path, file);
    if (uploadError) {
      setUploadingPhoto(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("client-photos").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("clients")
      .update({ photo_url: data.publicUrl })
      .eq("id", client.id);

    setUploadingPhoto(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPhotoUrl(data.publicUrl);
    router.refresh();
  }

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

    const { error: updateError } = await supabase
      .from("clients")
      .update({
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
      })
      .eq("id", client.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    await logAudit(supabase, currentStaff, "update", "clients", client.id, `Updated ${name}`);

    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3 mb-8">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 border border-line bg-parchmentAlt overflow-hidden shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-ink/40">No photo</div>
          )}
        </div>
        <label className="text-xs text-green font-medium hover:underline cursor-pointer">
          {uploadingPhoto ? "Uploading..." : "Change Photo"}
          <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
        </label>
      </div>

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
          <input
            name="company_name"
            required
            defaultValue={client.company_name ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink/60 mb-1">{clientType === "company" ? "Signatory Name" : "Name"}</label>
          <input
            name="name"
            required
            defaultValue={client.name}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={client.email}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <PhoneField name="phone" label="Phone" defaultValue={client.phone} />
        <div>
          <label className="block text-xs text-ink/60 mb-1">Preferred Language</label>
          <select
            name="preferred_language"
            defaultValue={client.preferred_language ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          >
            <option value="">Not set</option>
            <option value="EN">English</option>
            <option value="FR">French</option>
            <option value="AR">Arabic</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/60 mb-1">Secondary Email</label>
          <input
            name="secondary_email"
            type="email"
            defaultValue={client.secondary_email ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <PhoneField name="secondary_phone" label="Secondary Phone" defaultValue={client.secondary_phone} />
      </div>

      {clientType === "company" && (
        <>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold pt-2">Company Registration</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink/60 mb-1">CR Number</label>
              <input
                name="cr_number"
                defaultValue={client.cr_number ?? ""}
                className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Financial/Tax Number</label>
              <input
                name="tax_number"
                defaultValue={client.tax_number ?? ""}
                className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
              />
            </div>
          </div>
        </>
      )}

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold pt-2">
        {clientType === "company" ? "Company Contact" : "Contact Person"}
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Name</label>
          <input
            name="contact_person_name"
            defaultValue={client.contact_person_name ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <PhoneField name="contact_person_phone" label="Phone" defaultValue={client.contact_person_phone} />
        <div>
          <label className="block text-xs text-ink/60 mb-1">Relationship</label>
          <input
            name="contact_person_relationship"
            placeholder="e.g. Spouse, Assistant"
            defaultValue={client.contact_person_relationship ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
      </div>

      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold pt-2">Emergency Contact</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Name</label>
          <input
            name="emergency_contact_name"
            defaultValue={client.emergency_contact_name ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
        <PhoneField name="emergency_contact_phone" label="Phone" defaultValue={client.emergency_contact_phone} />
        <div>
          <label className="block text-xs text-ink/60 mb-1">Relationship</label>
          <input
            name="emergency_contact_relationship"
            placeholder="e.g. Sibling, Parent, Friend"
            defaultValue={client.emergency_contact_relationship ?? ""}
            className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-ink/60 mb-1">Notes / Feedback</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={client.notes ?? ""}
          className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-green text-parchment text-sm font-medium py-2 px-4 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-ink/60 font-medium py-2 px-4 border border-line"
        >
          Discard Changes
        </button>
      </div>
    </form>
  );
}
