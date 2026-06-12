// Decide how soon the results-sync cron should poll again, based on the
// fixtures' scheduled kickoffs. The goal: poll FREQUENTLY only around match
// windows (so finished scores appear within minutes of full-time) and rarely
// otherwise (so a rate-limited provider isn't hammered 144x/day for nothing).
//
// This is pure logic (no DB, no clock) so it can be unit-tested deterministically.

/** Minimal shape needed to reason about a fixture's timing. */
export interface PollMatch {
  kickoff: Date;
  status: string; // SCHEDULED | LIVE | FINISHED
}

export interface PollWindowConfig {
  /** Poll cadence while a match is live or about to start (seconds). */
  activeSeconds: number;
  /** Poll cadence during quiet periods (seconds). */
  idleSeconds: number;
  /** Minutes BEFORE kickoff to start polling actively (covers early kickoffs). */
  preKickoffMin: number;
  /** Minutes AFTER kickoff a match may still be in play / awaiting final (≈2.5h). */
  postKickoffMin: number;
}

export const DEFAULT_POLL_WINDOW: PollWindowConfig = {
  activeSeconds: 150, // 2.5 min during match windows
  idleSeconds: 21_600, // 6 h when nothing is near
  preKickoffMin: 15,
  postKickoffMin: 150, // 2.5 h after kickoff
};

/**
 * True if `now` falls inside any fixture's active window, i.e. a match is LIVE,
 * or scheduled to start within `preKickoffMin`, or kicked off within the last
 * `postKickoffMin` and isn't finished yet.
 */
export function inActiveWindow(
  matches: PollMatch[],
  now: Date,
  cfg: PollWindowConfig = DEFAULT_POLL_WINDOW,
): boolean {
  const t = now.getTime();
  const preMs = cfg.preKickoffMin * 60_000;
  const postMs = cfg.postKickoffMin * 60_000;

  for (const m of matches) {
    if (m.status === "LIVE") return true;
    // A finished match needs no more polling; skip it.
    if (m.status === "FINISHED") continue;
    const k = m.kickoff.getTime();
    // Window: [kickoff - pre, kickoff + post].
    if (t >= k - preMs && t <= k + postMs) return true;
  }
  return false;
}

/** Seconds the cron should sleep before its next sync, given the schedule. */
export function nextPollSeconds(
  matches: PollMatch[],
  now: Date,
  cfg: PollWindowConfig = DEFAULT_POLL_WINDOW,
): number {
  return inActiveWindow(matches, now, cfg)
    ? cfg.activeSeconds
    : cfg.idleSeconds;
}
