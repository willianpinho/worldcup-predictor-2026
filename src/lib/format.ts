const KICKOFF_FMT = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Kickoff shown in Brazil time (BRT), the project author's reference. */
export function formatKickoff(date: Date): string {
  return KICKOFF_FMT.format(date);
}

/** Tailwind classes for a points badge by tier. */
export function pointsBadgeClass(points: number | null): string {
  if (points === null) return "bg-surface-2 text-muted";
  if (points === 5) return "bg-accent/20 text-accent";
  if (points === 3) return "bg-emerald-500/15 text-emerald-300";
  if (points === 2) return "bg-amber-500/15 text-amber-300";
  return "bg-rose-500/15 text-rose-300";
}
