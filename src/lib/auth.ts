import { timingSafeEqual } from "node:crypto";

function constantTimeEqual(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Admin actions (import predictions, manual result, sync) sent from the /admin UI. */
export function isAuthorizedAdmin(req: Request): boolean {
  return constantTimeEqual(req.headers.get("x-admin-token"), process.env.ADMIN_TOKEN);
}

/** Cron sidecar hitting the results-sync endpoint with the shared secret. */
export function isAuthorizedCron(req: Request): boolean {
  return constantTimeEqual(req.headers.get("x-cron-secret"), process.env.CRON_SECRET);
}
