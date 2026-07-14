"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print text-xs bg-green text-parchment font-medium px-3 py-1.5"
    >
      Print / Save as PDF
    </button>
  );
}
