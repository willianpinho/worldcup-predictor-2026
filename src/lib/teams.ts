// Team-name normalization shared by the fixture providers and the prediction import.
// Goal: the same fixture maps to the same key whether names come from API-Football (EN),
// openfootball (EN), or the AIs (often PT-BR), and regardless of home/away order.

/** Lowercase, strip accents, expand "&", keep only a–z0–9. */
function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

// Maps any common variant (PT-BR, abbreviations, alt spellings) to a canonical slug.
// Keys and values are already slugged. Only entries that differ from the canonical
// English slug need to appear here.
const ALIASES: Record<string, string> = {
  // host / common
  estadosunidos: "unitedstates",
  eua: "unitedstates",
  usa: "unitedstates",
  mexico: "mexico",
  canada: "canada",
  // Europe
  inglaterra: "england",
  alemanha: "germany",
  espanha: "spain",
  franca: "france",
  paisesbaixos: "netherlands",
  holanda: "netherlands",
  belgica: "belgium",
  croacia: "croatia",
  suica: "switzerland",
  suíca: "switzerland",
  dinamarca: "denmark",
  noruega: "norway",
  escocia: "scotland",
  republicacheca: "czechrepublic",
  republicatcheca: "czechrepublic",
  tchequia: "czechrepublic",
  chequia: "czechrepublic",
  // South America
  brasil: "brazil",
  // Africa
  africadosul: "southafrica",
  marrocos: "morocco",
  argelia: "algeria",
  egito: "egypt",
  senegal: "senegal",
  costadomarfim: "ivorycoast",
  cotedivoire: "ivorycoast",
  // Asia / others
  coreiadosul: "southkorea",
  coreia: "southkorea",
  arabiasaudita: "saudiarabia",
  catar: "qatar",
  japao: "japan",
  ira: "iran",
  australia: "australia",
  novazelandia: "newzealand",
  bosnia: "bosniaandherzegovina",
  bosniaeherzegovina: "bosniaandherzegovina",
  bosniaherzegovina: "bosniaandherzegovina",
};

/** Canonical, comparison-safe team identifier. */
export function normalizeTeam(name: string): string {
  const s = slug(name);
  return ALIASES[s] ?? s;
}

/** Single letter for a group label like "Group A", "Grupo A", or "A". */
export function groupLetter(group: string): string {
  const m = group.toUpperCase().match(/([A-L])\s*$/);
  return m ? m[1] : group.trim().toUpperCase();
}

/**
 * Order-independent key for the two teams of a fixture. A given pair meets only
 * once in the whole group stage, so this uniquely identifies the match regardless
 * of group label or home/away order. Used to align results across providers.
 */
export function pairKey(teamA: string, teamB: string): string {
  return [normalizeTeam(teamA), normalizeTeam(teamB)].sort().join("-vs-");
}

/**
 * Natural key for a fixture: group + the team pair. Used as Match.extId so the
 * seed is idempotent.
 */
export function naturalKey(group: string, teamA: string, teamB: string): string {
  return `wc-${groupLetter(group)}-${pairKey(teamA, teamB)}`;
}
