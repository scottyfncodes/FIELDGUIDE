import type { Area, Log, StartPoint, Trail, Verdict } from "../data/types";
import { driveMin } from "./geo";
import { inSeason } from "./season";

/* ---------- DIFFICULTY ----------
   The data uses descriptive labels ("Easy–Moderate", "Moderate (sand)"…).
   Filtering and color use four buckets; the original label is still shown. */
export type DiffBucket = "Easy" | "Moderate" | "Hard" | "Very Hard";
export const DIFF_BUCKETS: DiffBucket[] = ["Easy", "Moderate", "Hard", "Very Hard"];

export function diffBucket(diff: string | undefined): DiffBucket {
  const d = diff || "";
  if (d.includes("Very")) return "Very Hard";
  if (d.includes("Hard")) return "Hard";
  if (d.includes("Moderate")) return "Moderate";
  return "Easy";
}
export const DIFF_RANK: Record<DiffBucket, number> = { Easy: 0, Moderate: 1, Hard: 2, "Very Hard": 3 };

/* ---------- TIME ON TRAIL ----------
   "Book time" (the AMC rule): 30 min per mile + 30 min per 1,000 ft of climbing.
   A planning number, clearly labeled as an estimate — never a promise. */
export function bookHours(t: Pick<Trail, "mi" | "gain" | "rtMi">): number {
  const mi = t.rtMi ?? t.mi;
  return mi * 0.5 + (t.gain || 0) / 1000 * 0.5;
}

export function fmtHours(h: number): string {
  if (h < 1) return `${Math.max(15, Math.round((h * 60) / 15) * 15)} min`;
  const r = Math.round(h * 2) / 2;
  return `${r % 1 ? r.toFixed(1) : r} hr`;
}

export type TimeBucket = "any" | "short" | "half" | "long";
export const TIME_OPTS: { key: TimeBucket; label: string }[] = [
  { key: "any", label: "Any length" },
  { key: "short", label: "Under 2 hr" },
  { key: "half", label: "2–4 hr" },
  { key: "long", label: "4 hr +" },
];
export function inTimeBucket(t: Trail, b: TimeBucket): boolean {
  const h = bookHours(t);
  if (b === "short") return h < 2;
  if (b === "half") return h >= 2 && h < 4;
  if (b === "long") return h >= 4;
  return true;
}

/* ---------- FILTER + SORT ---------- */
export type SortKey = "near" | "views" | "short" | "easy";
export const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: "near", label: "Nearest" },
  { key: "views", label: "Best views" },
  { key: "short", label: "Shortest" },
  { key: "easy", label: "Least climbing" },
];

export interface Filters {
  q: string;
  diff: DiffBucket | "any";
  time: TimeBucket;
  region: string | null; // region key
  regionAreas?: string[];
  seasonOnly: boolean;
  notDone: boolean;
  goodWx: boolean;
}

export const EMPTY_FILTERS: Filters = {
  q: "", diff: "any", time: "any", region: null, seasonOnly: false, notDone: false, goodWx: false,
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "");

export function matchesQuery(t: Trail, area: Area | undefined, q: string): boolean {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = norm([t.name, area?.label, t.th, t.type].filter(Boolean).join(" "));
  return words.every((w) => hay.includes(w));
}

export function filterTrails(
  trails: Trail[],
  f: Filters,
  ctx: { areas: Record<string, Area>; log: Log; month: number; verdictFor: (t: Trail) => Verdict | null },
): Trail[] {
  return trails.filter((t) => {
    if (f.diff !== "any" && diffBucket(t.diff) !== f.diff) return false;
    if (!inTimeBucket(t, f.time)) return false;
    if (f.regionAreas && !f.regionAreas.includes(t.area)) return false;
    if (f.seasonOnly && !inSeason(t.prime, ctx.month)) return false;
    if (f.notDone && ctx.log[t.id]?.done) return false;
    if (f.goodWx && ctx.verdictFor(t) !== "GOOD") return false;
    return matchesQuery(t, ctx.areas[t.area], f.q);
  });
}

export function sortTrails(trails: Trail[], key: SortKey, start: StartPoint | null): Trail[] {
  const out = trails.slice();
  const byName = (a: Trail, b: Trail) => a.name.localeCompare(b.name);
  if (key === "views") out.sort((a, b) => b.views - a.views || bookHours(a) - bookHours(b) || byName(a, b));
  else if (key === "short") out.sort((a, b) => bookHours(a) - bookHours(b) || byName(a, b));
  else if (key === "easy") out.sort((a, b) => a.gain - b.gain || a.mi - b.mi || byName(a, b));
  else out.sort((a, b) => (driveMin(start, a) ?? 0) - (driveMin(start, b) ?? 0) || byName(a, b));
  return out;
}

export function activeFilterCount(f: Filters): number {
  return [f.q.trim() !== "", f.diff !== "any", f.time !== "any", !!f.region, f.seasonOnly, f.notDone, f.goodWx]
    .filter(Boolean).length;
}

/* ---------- STANDING ----------
   Where one trail sits among the rest of the atlas on a single number:
   how many of the others are below it. Plain counting, no ranking claims. */
export function standing(t: Trail, all: Trail[], key: "mi" | "gain"): { below: number; others: number; min: number; max: number } {
  const others = all.filter((o) => o.id !== t.id);
  const vals = all.map((o) => o[key]);
  return {
    below: others.filter((o) => o[key] < t[key]).length,
    others: others.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
  };
}

/* Trails whose listed best months name the given month (year-round ones are
   left out: they're always "in season"), most scenic first, then nearest. */
export function seasonPicks(trails: Trail[], month: number, start: StartPoint | null, n = 8): Trail[] {
  return trails
    .filter((t) => !/year-round/i.test(t.prime) && inSeason(t.prime, month))
    .sort((a, b) => b.views - a.views || (driveMin(start, a) ?? 0) - (driveMin(start, b) ?? 0) || a.name.localeCompare(b.name))
    .slice(0, n);
}
