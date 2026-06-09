import { z, ZodError } from "zod";
import { isAuthorizedAdmin } from "@/lib/auth";
import { setManualResult } from "@/lib/sync";

const Body = z.object({
  matchId: z.number().int().positive(),
  scoreA: z.number().int().min(0).max(30),
  scoreB: z.number().int().min(0).max(30),
});

export async function POST(req: Request) {
  if (!isAuthorizedAdmin(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { matchId, scoreA, scoreB } = Body.parse(await req.json());
    await setManualResult(matchId, scoreA, scoreB);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json({ error: "Validation failed", issues: err.issues }, { status: 400 });
    }
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
