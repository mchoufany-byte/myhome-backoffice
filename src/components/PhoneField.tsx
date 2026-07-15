"use client";

import { useState } from "react";

// Common Lebanese-diaspora destinations first (GCC, then wider), Lebanon itself
// leads since most numbers entered here are still Lebanon-based property owners
// or local contacts.
export const COUNTRY_CODES: { code: string; label: string; flag: string }[] = [
  { code: "+961", label: "Lebanon", flag: "🇱🇧" },
  { code: "+971", label: "UAE", flag: "🇦🇪" },
  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", label: "Qatar", flag: "🇶🇦" },
  { code: "+965", label: "Kuwait", flag: "🇰🇼" },
  { code: "+973", label: "Bahrain", flag: "🇧🇭" },
  { code: "+968", label: "Oman", flag: "🇴🇲" },
  { code: "+962", label: "Jordan", flag: "🇯🇴" },
  { code: "+20", label: "Egypt", flag: "🇪🇬" },
  { code: "+964", label: "Iraq", flag: "🇮🇶" },
  { code: "+963", label: "Syria", flag: "🇸🇾" },
  { code: "+90", label: "Turkey", flag: "🇹🇷" },
  { code: "+357", label: "Cyprus", flag: "🇨🇾" },
  { code: "+30", label: "Greece", flag: "🇬🇷" },
  { code: "+1", label: "US / Canada", flag: "🇺🇸" },
  { code: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+41", label: "Switzerland", flag: "🇨🇭" },
  { code: "+46", label: "Sweden", flag: "🇸🇪" },
  { code: "+31", label: "Netherlands", flag: "🇳🇱" },
  { code: "+34", label: "Spain", flag: "🇪🇸" },
  { code: "+39", label: "Italy", flag: "🇮🇹" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "+54", label: "Argentina", flag: "🇦🇷" },
  { code: "+225", label: "Ivory Coast", flag: "🇨🇮" },
  { code: "+221", label: "Senegal", flag: "🇸🇳" },
  { code: "+234", label: "Nigeria", flag: "🇳🇬" },
  { code: "+27", label: "South Africa", flag: "🇿🇦" },
];

const DEFAULT_CODE = "+961";

function splitPhone(value: string | null | undefined): { code: string; rest: string } {
  const v = (value ?? "").trim();
  if (!v) return { code: DEFAULT_CODE, rest: "" };

  const match = [...COUNTRY_CODES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => v.startsWith(c.code));
  if (match) {
    return { code: match.code, rest: v.slice(match.code.length).trim() };
  }
  // Doesn't match a code in our list (old free-text data, or unlisted country) --
  // keep the original text in the number field rather than silently dropping it.
  return { code: DEFAULT_CODE, rest: v };
}

// Renders a country-code dropdown + local-number input, but writes the combined
// "+code number" string into a single hidden <input>. This lets every existing
// form keep reading the value the same way it always has --
// (form.elements.namedItem(name) as HTMLInputElement).value -- with no changes
// needed anywhere else.
export function PhoneField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  const initial = splitPhone(defaultValue);
  const [code, setCode] = useState(initial.code);
  const [rest, setRest] = useState(initial.rest);

  const combined = rest.trim() ? `${code} ${rest.trim()}` : "";

  return (
    <div>
      <label className="block text-xs text-ink/60 mb-1">{label}</label>
      <div className="flex gap-1.5">
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label={`${label} country code`}
          className="w-[92px] shrink-0 border border-line bg-parchment px-1 py-2 text-sm"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code + c.label} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <input
          value={rest}
          onChange={(e) => setRest(e.target.value)}
          placeholder={placeholder ?? "71 234 567"}
          inputMode="tel"
          pattern="[0-9()\-\s]{6,18}"
          title="Numbers only (spaces, dashes, and parentheses are fine), at least 6 digits."
          className="flex-1 min-w-0 border border-line bg-parchment px-2.5 py-2 text-sm"
        />
      </div>
      <input type="hidden" name={name} value={combined} readOnly />
    </div>
  );
}
