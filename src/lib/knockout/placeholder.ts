// Pretty-prints openfootball knockout placeholder codes into human labels.
// These codes appear until a slot's team is decided, then openfootball swaps in
// the real name (which falls through to the raw-string branch and renders as-is).
//
// Observed code shapes (2026 worldcup.json):
//   1A          -> "Group A winner"
//   2A          -> "Group A runner-up"
//   3A/B/C/D/F  -> "Best 3rd (A/B/C/D/F)"   (slash-separated group set)
//   W73         -> "Winner of match 73"
//   L101        -> "Loser of match 101"
//   anything else (a real team name) -> returned unchanged

const GROUP_WINNER = /^1([A-L])$/;
const GROUP_RUNNER_UP = /^2([A-L])$/;
const BEST_THIRD = /^3([A-L](?:\/[A-L])*)$/; // e.g. 3A/B/C/D/F
const WINNER_OF = /^W(\d{2,3})$/;
const LOSER_OF = /^L(\d{2,3})$/;

/** True when a stored team value is still an undecided placeholder code. */
export function isPlaceholder(value: string): boolean {
  return (
    GROUP_WINNER.test(value) ||
    GROUP_RUNNER_UP.test(value) ||
    BEST_THIRD.test(value) ||
    WINNER_OF.test(value) ||
    LOSER_OF.test(value)
  );
}

/** Human-readable label for a placeholder code, or the raw string if it's a real team. */
export function prettyPlaceholder(value: string): string {
  const v = value.trim();

  let m = v.match(GROUP_WINNER);
  if (m) return `Group ${m[1]} winner`;

  m = v.match(GROUP_RUNNER_UP);
  if (m) return `Group ${m[1]} runner-up`;

  m = v.match(BEST_THIRD);
  if (m) return `Best 3rd (${m[1]})`;

  m = v.match(WINNER_OF);
  if (m) return `Winner of match ${Number(m[1])}`;

  m = v.match(LOSER_OF);
  if (m) return `Loser of match ${Number(m[1])}`;

  return value;
}
