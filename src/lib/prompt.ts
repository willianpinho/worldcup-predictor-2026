// Single source of truth for the prediction prompt shown on /prompt and documented
// in docs/PROMPT.md. This is the exact text fed to Claude and Gemini.

// The shared analytical core: the per-match signals to weigh and the calibration ask.
// Reused verbatim by the per-group API prompts in experiment.ts. Kept as its own constant
// so the two prompt families stay in sync; PREDICTION_PROMPT below interpolates it so its
// final string is unchanged (it is a historical artifact shown verbatim on /prompt).
export const CORE_ANALYSIS = `For each match, weigh: squad strength and individual quality; FIFA ranking and recent
form (qualifiers + friendlies over the last 12 months); the form of key players in the
2025/26 club season; injuries/suspensions/final-squad cuts; tactical setup and the
manager's tournament record; head-to-head history; venue context (travel, time zones,
ALTITUDE in Mexico City, summer HEAT and HUMIDITY, pitch); home advantage for the
hosts; and market signals (betting odds).

For each match, derive the probability of a home win / draw / away win (summing to
100%) and the most likely scoreline. Be calibrated: prefer honest accuracy over false
confidence.`;

export const PREDICTION_PROMPT = `You are a quantitative football analyst. Predict ALL 72 group-stage matches of the
2026 FIFA World Cup (hosted by the USA, Canada and Mexico; 48 teams; 12 groups A–L;
played between June 11 and June 27, 2026). Use the OFFICIAL FIFA draw and schedule;
if you have web access, confirm the real groups, fixtures and dates.

${CORE_ANALYSIS}

RESPOND WITH VALID JSON ONLY, no text before or after, in exactly this shape:

{
  "model": "claude",
  "predictions": [
    {
      "group": "A",
      "teamA": "<home team>",
      "teamB": "<away team>",
      "scoreA": <int>,
      "scoreB": <int>,
      "probWinA": <0-100>,
      "probDraw": <0-100>,
      "probWinB": <0-100>,
      "confidence": "high|medium|low",
      "reasoning": "<one sentence with the main signal>"
    }
  ]
}

Include all 72 group-stage matches. Do not invent teams, matches or statistics.`;
