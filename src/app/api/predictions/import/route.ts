import { ZodError } from "zod";
import { isAuthorizedAdmin } from "@/lib/auth";
import { importPredictions } from "@/lib/importPredictions";

export async function POST(req: Request) {
  if (!isAuthorizedAdmin(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const report = await importPredictions(body);
    return Response.json(report);
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json(
        { error: "Validation failed", issues: err.issues },
        { status: 400 },
      );
    }
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
