export function ComingSoon({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="p-8">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">{eyebrow}</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-6">{title}</h1>
      <div className="bg-surface border border-line border-dashed p-8 text-sm text-ink/50">
        This section is being built next.
      </div>
    </div>
  );
}
