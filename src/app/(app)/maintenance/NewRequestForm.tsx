"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NewRequestForm({ properties }: { properties: { id: string; nickname: string | null; address: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const property_id = (form.elements.namedItem("property_id") as HTMLSelectElement).value;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value || null;
    const vendor = (form.elements.namedItem("vendor") as HTMLInputElement).value || null;
    const quoteRaw = (form.elements.namedItem("quote_amount") as HTMLInputElement).value;
    const quote_amount = quoteRaw ? Number(quoteRaw) : null;
    const fileInput = form.elements.namedItem("quote_file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!property_id || !title) {
      setError("Property and title are required.");
      return;
    }

    setUploading(true);
    const supabase = createClient();

    let quote_url: string | null = null;
    if (file) {
      // See matching comment in DocumentUploadForm.tsx -- Supabase Storage
      // rejects keys with characters outside letters/numbers/!-_.*'().
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${property_id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("maintenance-quotes").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }
      quote_url = supabase.storage.from("maintenance-quotes").getPublicUrl(path).data.publicUrl;
    }

    const { error: insertError } = await supabase.from("maintenance_requests").insert({
      property_id,
      title,
      description,
      vendor,
      quote_amount,
      quote_url,
      status: "quote_ready",
    });

    setUploading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-surface border border-line p-4 space-y-3">
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs text-ink/60 mb-1">Property</label>
        <select name="property_id" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          <option value="">Select...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nickname || p.address}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Title</label>
        <input name="title" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Description</label>
        <textarea name="description" rows={3} className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Vendor</label>
        <input name="vendor" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Quote Amount ($)</label>
        <input name="quote_amount" type="number" step="0.01" className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Quote Attachment</label>
        <input name="quote_file" type="file" className="w-full text-xs" />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={uploading}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {uploading ? "Sending..." : "Send for Approval"}
        </button>
        <button
          type="reset"
          onClick={() => setError(null)}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
      <p className="text-[11px] text-ink/50">This goes straight to the client for approval on their next app open.</p>
    </form>
  );
}
