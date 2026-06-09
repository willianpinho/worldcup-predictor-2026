import { MatchList } from "@/components/MatchList";
import { getMatches } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const matches = await getMatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Group-stage matches</h1>
        <p className="mt-1 text-sm text-muted">
          72 matches, June 11–27. <span className="text-claude">C</span> = Claude ·{" "}
          <span className="text-gemini">G</span> = Gemini. Kickoff times in BRT.
        </p>
      </div>
      <MatchList matches={matches} />
    </div>
  );
}
