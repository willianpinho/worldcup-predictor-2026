function Swatch({ className }: { className: string }) {
  return (
    <span className={`h-3 w-3 shrink-0 rounded-sm ${className}`} aria-hidden />
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <Swatch className="bg-accent/70" />
        Top 2 — advance
      </span>
      <span className="flex items-center gap-1.5">
        <Swatch className="bg-amber-400/70" />
        Third place — in the best 8
      </span>
      <span className="flex items-center gap-1.5">
        <Swatch className="bg-surface-2" />
        Eliminated
      </span>
    </div>
  );
}
