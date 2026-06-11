const KICKOFF_FMT = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** Kickoff shown in UTC (neutral across the three host countries). */
export function formatKickoff(date: Date): string {
  return `${KICKOFF_FMT.format(date)} UTC`;
}

const RUN_FMT = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** Timestamp for a recorded model run, in UTC. */
export function formatRunTimestamp(iso: string): string {
  return `${RUN_FMT.format(new Date(iso))} UTC`;
}

const SHORT_DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Compact kickoff date for bracket cells, day-first, e.g. "28 Jun" (UTC). */
export function formatShortDate(date: Date): string {
  return SHORT_DAY_FMT.format(date);
}

/** Primary city from an openfootball ground, e.g. "Los Angeles (Inglewood)" -> "Los Angeles". */
export function cityLabel(ground: string | null): string | null {
  if (!ground) return null;
  const paren = ground.indexOf(" (");
  return (paren === -1 ? ground : ground.slice(0, paren)).trim() || null;
}

/** Tailwind classes for a points badge by tier. */
export function pointsBadgeClass(points: number | null): string {
  if (points === null) return "bg-surface-2 text-muted";
  if (points === 5) return "bg-accent/20 text-accent";
  if (points === 3) return "bg-emerald-500/15 text-emerald-300";
  if (points === 2) return "bg-amber-500/15 text-amber-300";
  return "bg-rose-500/15 text-rose-300";
}
