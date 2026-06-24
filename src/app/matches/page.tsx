import { ConditionTabs } from "@/components/ConditionTabs";
import { MatchList } from "@/components/MatchList";
import { CONDITION_META, parseArm } from "@/lib/conditions";
import { getMatches } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { arm: rawArm } = await searchParams;
  const arm = parseArm(rawArm);
  const matches = await getMatches(arm);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Group-stage timeline</h1>
        <p className="mt-1 text-sm text-muted">
          72 matches in kickoff order, June 11–27.{" "}
          <span className="text-claude">C</span> = Claude ·{" "}
          <span className="text-gemini">G</span> = Gemini ·{" "}
          <span className="text-openai">O</span> = OpenAI. Kickoff times in UTC.
        </p>
      </div>
      <div className="space-y-2">
        <ConditionTabs path="/matches" current={arm} />
        <p className="text-sm text-muted">{CONDITION_META[arm].description}</p>
      </div>
      <MatchList matches={matches} />
    </div>
  );
}
