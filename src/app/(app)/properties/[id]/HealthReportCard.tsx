"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type HealthScore = {
  id: string;
  overall_score: number | null;
  water_score: number | null;
  hvac_score: number | null;
  electrical_score: number | null;
  humidity_score: number | null;
  cleanliness_score: number | null;
  security_score: number | null;
  maintenance_score: number | null;
  report_period: string | null;
  recommendations: string | null;
  filed_at: string | null;
};

const SCORE_FIELDS: { key: keyof HealthScore; label: string }[] = [
  { key: "water_score", label: "Water" },
  { key: "hvac_score", label: "HVAC" },
  { key: "electrical_score", label: "Electrical" },
  { key: "humidity_score", label: "Humidity" },
  { key: "cleanliness_score", label: "Cleanliness" },
  { key: "security_score", label: "Security" },
  { key: "maintenance_score", label: "Maintenance" },
];

function scoreColor(score: number | null) {
  if (score === null) return "text-ink/40";
  if (score >= 80) return "text-green";
  if (score >= 50) return "text-gold";
  return "text-red";
}

export function HealthReportCard({ propertyId, latest }: { propertyId: string; latest: HealthScore | null }) {
  const router = useRouter();
  const [filing, setFiling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement)?.value;

    const report_period = get("report_period");
    if (!report_period) {
      setError("Report period is required, e.g. \"2026 Annual\".");
      return;
    }

    const toScore = (name: string) => {
      const v = get(name);
      if (v === "" || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
    };

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("health_scores").insert({
      property_id: propertyId,
      report_period,
      overall_score: toScore("overall_score"),
      water_score: toScore("water_score"),
      hvac_score: toScore("hvac_score"),
      electrical_score: toScore("electrical_score"),
      humidity_score: toScore("humidity_score"),
      cleanliness_score: toScore("cleanliness_score"),
      security_score: toScore("security_score"),
      maintenance_score: toScore("maintenance_score"),
      recommendations: get("recommendations") || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setFiling(false);
    router.refresh();
  }

  return (
    <div className="bg-surface border border-line p-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold">Apartment Health Report</p>
        <button onClick={() => setFiling((v) => !v)} className="text-xs text-green font-medium hover:underline">
          {filing ? "Cancel" : latest ? "File New Report" : "File First Report"}
        </button>
      </div>

      {!filing && !latest && <p className="text-sm text-ink/50">No health report on file for this property yet.</p>}

      {!filing && latest && (
        <div>
          <div className="flex items-baseline gap-3 mb-3">
            <p className={`text-3xl font-serif ${scoreColor(latest.overall_score)}`}>
              {latest.overall_score ?? "—"}
            </p>
            <p className="text-xs text-ink/50">
              Overall &middot; {latest.report_period} &middot; filed{" "}
              {latest.filed_at ? new Date(latest.filed_at).toLocaleDateString() : "—"}
            </p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
            {SCORE_FIELDS.map((f) => (
              <div key={f.key} className="text-center">
                <p className={`text-sm font-medium ${scoreColor(latest[f.key] as number | null)}`}>
                  {(latest[f.key] as number | null) ?? "—"}
                </p>
                <p className="text-[9px] text-ink/50 uppercase tracking-wide">{f.label}</p>
              </div>
            ))}
          </div>
          {latest.recommendations && (
            <div>
              <p className="text-xs text-ink/50 uppercase tracking-wide mb-1">Recommendations</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{latest.recommendations}</p>
            </div>
          )}
        </div>
      )}

      {filing && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-xs text-red bg-red/5 border border-red/20 px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Report Period</label>
              <input
                name="report_period"
                placeholder="2026 Annual"
                className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Overall Score (0-100)</label>
              <input
                name="overall_score"
                type="number"
                min={0}
                max={100}
                className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {SCORE_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-[10px] text-ink/60 mb-1">{f.label}</label>
                <input
                  name={f.key}
                  type="number"
                  min={0}
                  max={100}
                  className="w-full border border-line bg-parchment px-2 py-1.5 text-xs"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs text-ink/60 mb-1">Recommended Repairs / Notes</label>
            <textarea
              name="recommendations"
              rows={3}
              placeholder="e.g. Water heater showing wear, recommend replacement within 12 months (~$400-700)."
              className="w-full border border-line bg-parchment px-2.5 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-green text-parchment text-sm font-medium px-4 py-2.5 disabled:opacity-60"
          >
            {saving ? "Filing..." : "File Report"}
          </button>
        </form>
      )}
    </div>
  );
}
