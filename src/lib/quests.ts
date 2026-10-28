import { SPECIES, speciesById } from "../data/species";
import type { Species } from "../data/species";
import type { AtlasData } from "./atlas";
import { collection } from "./atlas";
import { placeByRef } from "./places";

/* ---------- QUESTS ----------
   Optional challenges. Progress is always derived from what's saved (finds,
   outings, leaf checks), never stored or set by a tap, so deleting a find
   rolls a quest back and nothing can be faked. Each quest only uses species
   that are in the guide and places that are in the atlas. */

export interface QuestProgress {
  count: number;
  target: number;
  done: boolean;
  /** what counted: species ids or place refs, for the quest card */
  items: { kind: "species" | "place"; id: string }[];
}

export interface Quest {
  id: string;
  title: string;
  blurb: string;
  /** months (1–12) when the quest can make progress; absent = any time */
  months?: number[];
  hint: string;
  progress: (d: AtlasData) => QuestProgress;
}

const finds = (d: AtlasData) => d.observations.filter((o) => o.kind === "find" && o.speciesId);
const sp = (id: string | null) => speciesById(id) as Species | undefined;
const mk = (count: number, target: number, items: QuestProgress["items"]): QuestProgress =>
  ({ count: Math.min(count, target), target, done: count >= target, items });

const PINE_BUNDLE: Record<string, string> = { bundle2: "2", bundle3: "3", bundle5: "5" };
export const GUIDE_TREES = SPECIES.filter((s) => s.habit === "tree");

export const QUESTS: Quest[] = [
  {
    id: "leaf-shapes",
    title: "Five leaf shapes",
    blurb: "Find plants with five different leaf shapes: needles, lobes, hearts, whatever the trail offers.",
    hint: "Each species in the guide has one leaf shape. Different species with the same shape count once.",
    progress: (d) => {
      const shapes = new Map<string, string>();
      collection(d).forEach((e) => { const s = sp(e.speciesId); if (s && !shapes.has(s.leaf)) shapes.set(s.leaf, s.id); });
      return mk(shapes.size, 5, [...shapes.values()].map((id) => ({ kind: "species", id })));
    },
  },
  {
    id: "three-trees-one-outing",
    title: "Three trees, one outing",
    blurb: "Identify three different tree species on a single outing.",
    hint: "Start an outing from a trail page, then save your finds. Shrubs don't count.",
    progress: (d) => {
      let best: string[] = [];
      d.outings.forEach((out) => {
        const trees = [...new Set(finds(d).filter((o) => o.outingId === out.id && sp(o.speciesId)?.habit === "tree").map((o) => o.speciesId!))];
        if (trees.length > best.length) best = trees;
      });
      return mk(best.length, 3, best.map((id) => ({ kind: "species", id })));
    },
  },
  {
    id: "count-the-needles",
    title: "Count the needles",
    blurb: "Find pines with needles in bundles of two, three and five.",
    hint: "Lodgepole and pinyon carry twos, ponderosa threes, limber and bristlecone fives.",
    progress: (d) => {
      const got = new Map<string, string>();
      collection(d).forEach((e) => {
        const s = sp(e.speciesId);
        const n = s?.sci.startsWith("Pinus ") ? PINE_BUNDLE[s.traits.needles?.[0] ?? ""] : undefined;
        if (n && !got.has(n)) got.set(n, s!.id);
      });
      return mk(got.size, 3, [...got.values()].map((id) => ({ kind: "species", id })));
    },
  },
  {
    id: "summer-wildflowers",
    title: "Summer wildflowers",
    blurb: "Find four different wildflowers in bloom between June and August.",
    months: [6, 7, 8],
    hint: "Finds dated June through August count, in any year.",
    progress: (d) => {
      const got = [...new Set(finds(d).filter((o) => {
        const m = new Date(o.observedAt).getMonth() + 1;
        return m >= 6 && m <= 8 && sp(o.speciesId)?.groups.includes("flower");
      }).map((o) => o.speciesId!))];
      return mk(got.length, 4, got.map((id) => ({ kind: "species", id })));
    },
  },
  {
    id: "above-treeline",
    title: "Above treeline",
    blurb: "Find a plant that only grows on the alpine tundra.",
    months: [6, 7, 8, 9],
    hint: "Moss campion, alpine forget-me-not and alpine sunflower live above about 11,500 ft.",
    progress: (d) => {
      const got = collection(d).map((e) => sp(e.speciesId)).filter((s): s is Species => !!s && s.zones.length === 1 && s.zones[0] === "alpine");
      return mk(got.length, 1, got.map((s) => ({ kind: "species", id: s.id })));
    },
  },
  {
    id: "new-ground",
    title: "New ground",
    blurb: "Finish outings on three different trails.",
    hint: "Start an outing from any trail page and end it when you're done.",
    progress: (d) => {
      const refs = [...new Set(d.outings.filter((o) => o.endedAt && o.placeRef?.startsWith("trail:")).map((o) => o.placeRef!))];
      return mk(refs.length, 3, refs.map((id) => ({ kind: "place", id })));
    },
  },
  {
    id: "leaf-peeper",
    title: "Leaf peeper",
    blurb: "Log a leaf check at three different fall-color spots.",
    months: [9, 10],
    hint: "Open a fall-color spot from Explore and log how much color you see.",
    progress: (d) => {
      const refs = [...new Set(d.observations.filter((o) => o.kind === "leafcheck" && placeByRef(o.placeRef)?.kind === "color").map((o) => o.placeRef!))];
      return mk(refs.length, 3, refs.map((id) => ({ kind: "place", id })));
    },
  },
  {
    id: "dark-sky",
    title: "Under a dark sky",
    blurb: "Log an outing at one of the dark-sky sites.",
    hint: "Turn on the Dark skies layer in Explore to find one.",
    progress: (d) => {
      const refs = [...new Set(d.outings.filter((o) => placeByRef(o.placeRef)?.kind === "sky").map((o) => o.placeRef!))];
      return mk(refs.length, 1, refs.map((id) => ({ kind: "place", id })));
    },
  },
  {
    id: "every-tree",
    title: "Every tree in the guide",
    blurb: `Find all ${GUIDE_TREES.length} trees in the field guide, from plains cottonwood to bristlecone pine.`,
    hint: "A long one. The guide lists where and how high each tree grows.",
    progress: (d) => {
      const have = new Set(collection(d).map((e) => e.speciesId));
      const got = GUIDE_TREES.filter((s) => have.has(s.id));
      return mk(got.length, GUIDE_TREES.length, got.map((s) => ({ kind: "species", id: s.id })));
    },
  },
];

export const questInSeason = (q: Quest, month: number) => !q.months || q.months.includes(month);
