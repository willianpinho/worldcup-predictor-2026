import { isAuthorizedAdmin, isAuthorizedCron } from "@/lib/auth";
import { syncResults } from "@/lib/sync";

export async function POST(req: Request) {
  if (!isAuthorizedAdmin(req) && !isAuthorizedCron(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await syncResults();
    return Response.json(report);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
