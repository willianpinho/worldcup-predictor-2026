import { normalizeTeam } from "./teams";

// Maps each World Cup nation (by normalized name) to its flag-icons code
// (ISO 3166-1 alpha-2, with gb-eng / gb-sct for the home nations).
const ISO: Record<string, string> = {
  algeria: "dz",
  argentina: "ar",
  australia: "au",
  austria: "at",
  belgium: "be",
  bosniaandherzegovina: "ba",
  brazil: "br",
  canada: "ca",
  capeverde: "cv",
  colombia: "co",
  croatia: "hr",
  curacao: "cw",
  czechrepublic: "cz",
  drcongo: "cd",
  ecuador: "ec",
  egypt: "eg",
  england: "gb-eng",
  france: "fr",
  germany: "de",
  ghana: "gh",
  haiti: "ht",
  iran: "ir",
  iraq: "iq",
  ivorycoast: "ci",
  japan: "jp",
  jordan: "jo",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  newzealand: "nz",
  norway: "no",
  panama: "pa",
  paraguay: "py",
  portugal: "pt",
  qatar: "qa",
  saudiarabia: "sa",
  scotland: "gb-sct",
  senegal: "sn",
  southafrica: "za",
  southkorea: "kr",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  tunisia: "tn",
  turkey: "tr",
  unitedstates: "us",
  uruguay: "uy",
  uzbekistan: "uz",
};

/** flag-icons country code for a team name, or null if unknown. */
export function flagCode(team: string): string | null {
  return ISO[normalizeTeam(team)] ?? null;
}
