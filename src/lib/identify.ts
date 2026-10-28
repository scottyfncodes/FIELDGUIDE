import type { Group, Species, Zone } from "../data/species";
import { SPECIES } from "../data/species";

/* ---------- IDENTIFY: THE FIELD KEY ----------
   None of the three original apps had image recognition, and adding a paid
   vision API was out of scope, so identification is a guided key: the user
   answers what they can see (every question can be skipped) and each species
   in the guide is scored on how well its traits agree.

   The photo is the user's record of the find; it is NOT analysed. The results
   screen says so, and every result is worded as a suggestion. */

export interface Choice { key: string; label: string; hint?: string }
export interface Question { key: string; prompt: string; choices: Choice[] }

export const GROUP_CHOICES: { key: Group; label: string; hint: string }[] = [
  { key: "conifer", label: "Needles or scales", hint: "Pines, spruces, firs, junipers" },
  { key: "broadleaf", label: "Leaves on a tree or shrub", hint: "Woody stems, broad leaves" },
  { key: "flower", label: "A wildflower", hint: "Soft stems, in bloom" },
];

const ZONE_CHOICES: Choice[] = [
  { key: "plains", label: "Plains", hint: "below about 6,000 ft" },
  { key: "foothills", label: "Foothills", hint: "about 6,000 to 8,000 ft" },
  { key: "montane", label: "Montane", hint: "about 8,000 to 9,500 ft" },
  { key: "subalpine", label: "Subalpine", hint: "about 9,500 ft to treeline" },
  { key: "alpine", label: "Alpine", hint: "above treeline" },
];

export const QUESTIONS: Record<Group, Question[]> = {
  conifer: [
    { key: "needles", prompt: "How do the needles grow?", choices: [
      { key: "bundle2", label: "Bundles of 2", hint: "count where they join the twig" },
      { key: "bundle3", label: "Bundles of 3" },
      { key: "bundle5", label: "Bundles of 5" },
      { key: "single-flat", label: "Single, flat and soft", hint: "won't roll between fingers" },
      { key: "single-square", label: "Single, square and sharp", hint: "rolls between fingers" },
      { key: "awl", label: "Short, stiff, prickly", hint: "on a low shrub" },
      { key: "scale", label: "Tiny overlapping scales" },
    ] },
    { key: "cone", prompt: "What are the cones like?", choices: [
      { key: "pine-cone", label: "Woody, thick scales" },
      { key: "hanging-papery", label: "Hanging, thin papery scales" },
      { key: "upright", label: "Standing upright on the branch" },
      { key: "bracts", label: "Three-pointed tongues between scales" },
      { key: "berry", label: "Small blue berries" },
    ] },
  ],
  broadleaf: [
    { key: "arrangement", prompt: "How are the leaves attached?", choices: [
      { key: "opposite", label: "In pairs, across from each other" },
      { key: "alternate", label: "One at a time, staggered" },
    ] },
    { key: "leafType", prompt: "Is each leaf one blade or several leaflets?", choices: [
      { key: "simple", label: "One blade" },
      { key: "three-leaflets", label: "Three leaflets" },
      { key: "many-leaflets", label: "Five or more leaflets" },
    ] },
    { key: "shape", prompt: "What shape is a leaf (or leaflet)?", choices: [
      { key: "rounded", label: "Nearly round" },
      { key: "oval", label: "Oval" },
      { key: "lance", label: "Long and narrow, pointed" },
      { key: "triangular", label: "Triangular" },
      { key: "lobed", label: "Deep rounded lobes" },
      { key: "palmate", label: "Hand-shaped" },
      { key: "wedge", label: "Wedge, wider at the tip" },
      { key: "narrow", label: "Thread-thin" },
      { key: "tiny-evergreen", label: "Small, thick, glossy, evergreen" },
    ] },
    { key: "margin", prompt: "What does the edge look like?", choices: [
      { key: "toothed", label: "Toothed" },
      { key: "smooth", label: "Smooth" },
      { key: "lobed", label: "Lobed or scalloped" },
    ] },
    { key: "habit", prompt: "How does the plant grow?", choices: [
      { key: "tree", label: "Tree, one main trunk" },
      { key: "shrub", label: "Shrub, many stems" },
      { key: "groundcover", label: "Low mat or knee-high" },
    ] },
    { key: "feature", prompt: "Anything that stands out?", choices: [
      { key: "white-bark", label: "Smooth white bark" },
      { key: "flutter", label: "Leaves flutter in a breeze", hint: "flattened leaf stalks" },
      { key: "shiny-bark", label: "Shiny reddish bark" },
      { key: "acorns", label: "Acorns" },
      { key: "winged-seeds", label: "Paired winged seeds" },
      { key: "woody-cones", label: "Tiny woody cones" },
      { key: "feathery-seeds", label: "Seeds with feathery tails" },
      { key: "berries", label: "Berries or fruit" },
      { key: "thorns", label: "Thorns or prickles" },
      { key: "smell", label: "Strong smell when crushed" },
      { key: "none", label: "None of these" },
    ] },
  ],
  flower: [
    { key: "color", prompt: "What color are the flowers?", choices: [
      { key: "blue", label: "Blue" }, { key: "purple", label: "Purple" }, { key: "pink", label: "Pink" },
      { key: "red", label: "Red" }, { key: "orange", label: "Orange" }, { key: "yellow", label: "Yellow" },
      { key: "white", label: "White" },
    ] },
    { key: "form", prompt: "What shape are they?", choices: [
      { key: "daisy", label: "Daisy-like head" },
      { key: "cup", label: "Open cup, separate petals" },
      { key: "spike", label: "Many flowers on a spike" },
      { key: "tubular", label: "Tubes" },
      { key: "spurred", label: "Long spurs behind the petals" },
      { key: "cluster", label: "Flat or rounded cluster" },
      { key: "cushion", label: "Tiny flowers on a low cushion" },
    ] },
    { key: "zone", prompt: "Where are you?", choices: ZONE_CHOICES },
  ],
};

export type Answers = Record<string, string>;

export type Strength = "strong" | "possible" | "weak";

export interface Match {
  species: Species;
  /** answered questions the species agrees with */
  agree: number;
  /** answered questions */
  answered: number;
  score: number;
  strength: Strength;
  /** keys of answers that disagreed, so the result can show why */
  conflicts: string[];
  /** is it the right time of year to see what the key keyed on? */
  inSeason: boolean;
}

/* Score: share of answered questions the species agrees with. A species
   showing what you keyed on at the wrong time of year (a flower out of bloom)
   loses a little, never enough to hide it. Ties break on season, then name. */
export function rankMatches(group: Group, answers: Answers, month: number): Match[] {
  const qs = QUESTIONS[group].filter((q) => answers[q.key]);
  return SPECIES.filter((s) => s.groups.includes(group))
    .map((s): Match => {
      const conflicts = qs.filter((q) => !(s.traits[q.key] ?? []).includes(answers[q.key])).map((q) => q.key);
      const agree = qs.length - conflicts.length;
      const inSeason = group !== "flower" || s.look.some((l) => l.months.includes(month));
      const base = qs.length ? agree / qs.length : 0;
      const score = base - (inSeason ? 0 : 0.08);
      return { species: s, agree, answered: qs.length, score, conflicts, inSeason, strength: "weak" };
    })
    .sort((a, b) => b.score - a.score || Number(b.inSeason) - Number(a.inSeason) || a.species.common.localeCompare(b.species.common))
    .map((m, i, all) => ({ ...m, strength: strengthOf(m, i, all) }));
}

/* "strong" needs at least two answers, all agreeing, and no other species
   tied with it. Ties mean the key can't separate them, so both read "possible". */
function strengthOf(m: Match, i: number, all: Match[]): Strength {
  if (!m.answered || m.score <= 0.34) return "weak";
  const tiedWithNeighbour = (all[i - 1] && all[i - 1].agree === m.agree && all[i - 1].inSeason === m.inSeason) ||
    (all[i + 1] && all[i + 1].agree === m.agree && all[i + 1].inSeason === m.inSeason);
  if (m.agree === m.answered && m.answered >= 2 && m.inSeason && !tiedWithNeighbour) return "strong";
  return m.score >= 0.6 ? "possible" : "weak";
}

export const STRENGTH_TEXT: Record<Strength, string> = {
  strong: "Strong match",
  possible: "Possible match",
  weak: "Weak match",
};

/** The suggestions worth showing: everything above weak, or the best three if nothing is. */
export function shortlist(matches: Match[], max = 4): Match[] {
  const good = matches.filter((m) => m.strength !== "weak");
  return (good.length ? good : matches.filter((m) => m.answered)).slice(0, max);
}

export function zoneForElevation(ft: number): Zone {
  if (ft < 6000) return "plains";
  if (ft < 8000) return "foothills";
  if (ft < 9500) return "montane";
  if (ft < 11500) return "subalpine";
  return "alpine";
}
