import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { DocumentUploadForm } from "./DocumentUploadForm";

const CATEGORY_LABEL: Record<string, string> = {
  property: "Property",
  agreements: "Agreements",
  reports: "Reports",
  receipts: "Receipts",
  warranty: "Warranty",
};

function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function monthLabel(iso: string | null) {
  if (!iso) return "Undated";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function groupByMonth<T extends { uploaded_at: string | null }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = monthLabel(item.uploaded_at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries());
}

export default async function DocumentsPage() {
  await requireSection("documents");
  const supabase = createClient();

  const [{ data: documents }, { data: properties }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title, category, file_url, uploaded_at, properties(nickname, address)")
      .order("uploaded_at", { ascending: false }),
    supabase.from("properties").select("id, nickname, address").order("nickname", { ascending: true }),
  ]);

  // Grouped rather than a flat list -- since documents pile up fast per
  // property, sorting by upload month makes it possible to scan for "what
  // came in this month" instead of scrolling one long undifferentiated list.
  const grouped = groupByMonth(documents ?? []);

  return (
    <div className="p-8 max-w-4xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Portfolio</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">Documents</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {grouped.map(([month, docs]) => (
            <div key={month}>
              <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-2">
                {month} <span className="text-ink/40 normal-case">&middot; {docs.length}</span>
              </p>
              <div className="bg-surface border border-line divide-y divide-line">
                {docs.map((d: any) => (
                  <a
                    key={d.id}
                    href={d.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 hover:bg-surfaceAlt"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{d.title}</p>
                      <p className="text-xs text-ink/50 mt-0.5">
                        {d.properties?.nickname || d.properties?.address} · {shortDate(d.uploaded_at)}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-1 border border-line text-ink/60 uppercase tracking-wide">
                      {CATEGORY_LABEL[d.category] ?? d.category ?? "Property"}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
          {!documents?.length && (
            <div className="bg-surface border border-line">
              <p className="px-4 py-6 text-sm text-ink/50">No documents uploaded yet.</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Upload Document</p>
          <DocumentUploadForm properties={properties ?? []} />
        </div>
      </div>
    </div>
  );
}
