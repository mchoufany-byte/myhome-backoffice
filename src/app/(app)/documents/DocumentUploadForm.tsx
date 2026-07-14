"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  { value: "property", label: "Property" },
  { value: "agreements", label: "Agreements" },
  { value: "reports", label: "Reports" },
  { value: "receipts", label: "Receipts" },
  { value: "warranty", label: "Warranty" },
];

export function DocumentUploadForm({ properties }: { properties: { id: string; nickname: string | null; address: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const propertyId = (form.elements.namedItem("property_id") as HTMLSelectElement).value;
    const category = (form.elements.namedItem("category") as HTMLSelectElement).value;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!propertyId || !title || !file) {
      setError("Property, title, and file are all required.");
      return;
    }

    setUploading(true);
    const supabase = createClient();

    // Supabase Storage rejects keys with characters outside
    // letters/numbers/!-_.*'() -- em dashes, most punctuation, and even
    // plain spaces will 400 with "Invalid key". Keep the real filename in
    // the document's title/metadata; sanitize only the storage path.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${propertyId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(path);

    const { error: insertError } = await supabase.from("documents").insert({
      property_id: propertyId,
      category,
      title,
      file_url: data.publicUrl,
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
        <label className="block text-xs text-ink/60 mb-1">Category</label>
        <select name="category" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">Title</label>
        <input name="title" required className="w-full border border-line bg-parchment px-2.5 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-ink/60 mb-1">File</label>
        <input name="file" type="file" required className="w-full text-xs" />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={uploading}
          className="flex-1 bg-green text-parchment text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
        <button
          type="reset"
          onClick={() => setError(null)}
          className="text-sm text-ink/60 font-medium py-2.5 px-4 border border-line"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
