"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Photo = { id: string; url: string; caption: string | null };

export function PropertyGallery({ propertyId, photos }: { propertyId: string; photos: Photo[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${propertyId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("property-photos").upload(path, file);
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
    const { error: insertError } = await supabase
      .from("property_photos")
      .insert({ property_id: propertyId, url: data.publicUrl });

    setUploading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("property_photos").delete().eq("id", id);
    router.refresh();
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Photo Gallery</p>
        <label className="text-xs text-green font-medium hover:underline cursor-pointer">
          {uploading ? "Uploading..." : "Add Photo"}
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      </div>
      {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2 mb-3">{error}</div>}

      {!photos.length && <p className="text-sm text-ink/50">No photos yet.</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square border border-line overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? "Property photo"} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(p.id)}
                className="absolute top-1 right-1 bg-ink/70 text-parchment text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
