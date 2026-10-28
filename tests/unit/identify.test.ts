import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUESTIONS, rankMatches, shortlist, zoneForElevation } from "../../src/lib/identify";
import { SPECIES } from "../../src/data/species";
import { QUESTS } from "../../src/lib/quests";
import { addObservation, endOuting, getAtlas, reloadAtlas, removeObservation, startOuting } from "../../src/lib/atlas";
import type { NewObservation } from "../../src/lib/atlas";
import { fetchMonths, fetchNearby, fetchTaxon, parseNearby, stripHtml } from "../../src/lib/inat";
import { tonightAt } from "../../src/lib/tonight";

const top = (m: ReturnType<typeof rankMatches>) => m[0].species.id;

describe("the identify key", () => {
  it("every trait value a species uses is a choice the key can actually offer", () => {
    SPECIES.forEach((s) => s.groups.forEach((g) => QUESTIONS[g].forEach((q) => {
      const vals = s.traits[q.key];
      expect(vals, `${s.id} answers ${q.key}`).toBeTruthy();
      vals!.forEach((v) => expect(q.choices.map((c) => c.key), `${s.id}.${q.key}=${v}`).toContain(v));
    })));
  });

  it("keys out quaking aspen from a rounded, toothed, alternate leaf on a tree", () => {
    const m = rankMatches("broadleaf", { arrangement: "alternate", leafType: "simple", shape: "rounded", margin: "toothed", habit: "tree", feature: "white-bark" }, 9);
    expect(top(m)).toBe("quaking-aspen");
    expect(m[0].strength).toBe("strong");
  });

  it("separates the pines by needle bundle", () => {
    expect(top(rankMatches("conifer", { needles: "bundle3", cone: "pine-cone" }, 7))).toBe("ponderosa-pine");
    const fives = rankMatches("conifer", { needles: "bundle5", cone: "pine-cone" }, 7).slice(0, 2).map((x) => x.species.id).sort();
    expect(fives).toEqual(["bristlecone-pine", "limber-pine"]);
  });

  it("says 'possible', not 'strong', when the answers can't separate two species", () => {
    const m = rankMatches("conifer", { needles: "bundle5", cone: "pine-cone" }, 7);
    expect(m[0].strength).toBe("possible");
    expect(m[1].strength).toBe("possible");
  });

  it("one answer is never enough for a strong match", () => {
    const m = rankMatches("conifer", { needles: "scale" }, 7);
    expect(top(m)).toBe("rm-juniper");
    expect(m[0].strength).not.toBe("strong");
  });

  it("nudges flowers that aren't in bloom down without hiding them", () => {
    const answers = { color: "blue", form: "spurred", zone: "montane" };
    const july = rankMatches("flower", answers, 7);
    const nov = rankMatches("flower", answers, 11);
    expect(top(july)).toBe("blue-columbine");
    expect(july[0].strength).toBe("strong");
    expect(top(nov)).toBe("blue-columbine");
    expect(nov[0].inSeason).toBe(false);
    expect(nov[0].strength).not.toBe("strong");
  });

  it("records which answers disagreed", () => {
    const m = rankMatches("broadleaf", { arrangement: "opposite", shape: "rounded" }, 7);
    const aspen = m.find((x) => x.species.id === "quaking-aspen")!;
    expect(aspen.conflicts).toEqual(["arrangement"]);
  });

  it("shortlist with no answers is empty rather than a list of guesses", () => {
    expect(shortlist(rankMatches("flower", {}, 7))).toEqual([]);
  });

  it("maps elevation to life zones", () => {
    expect(zoneForElevation(5280)).toBe("plains");
    expect(zoneForElevation(9000)).toBe("montane");
    expect(zoneForElevation(12500)).toBe("alpine");
  });
});

const find = (speciesId: string, observedAt?: string): NewObservation => ({
  kind: "find", speciesId, candidates: [], idMethod: "guide", placeRef: null,
  note: "", photoId: null, thumb: null, coords: null, observedAt,
});
const quest = (id: string) => QUESTS.find((q) => q.id === id)!;

describe("quests derive progress from saved finds", () => {
  beforeEach(() => reloadAtlas());

  it("five leaf shapes counts distinct shapes, not repeat finds", () => {
    ["quaking-aspen", "quaking-aspen", "narrowleaf-cottonwood", "willows"].forEach((s) => addObservation(find(s)));
    expect(quest("leaf-shapes").progress(getAtlas()).count).toBe(2); // rounded + lance
    ["gambel-oak", "boxelder", "ponderosa-pine"].forEach((s) => addObservation(find(s)));
    const p = quest("leaf-shapes").progress(getAtlas());
    expect(p).toMatchObject({ count: 5, done: true });
  });

  it("three trees must be on the same outing, and shrubs don't count", () => {
    const a = startOuting("trail:greenmtn");
    addObservation(find("ponderosa-pine"));
    addObservation(find("gambel-oak")); // shrub
    endOuting(a.id);
    startOuting("trail:ntable");
    addObservation(find("rm-juniper"));
    addObservation(find("douglas-fir"));
    expect(quest("three-trees-one-outing").progress(getAtlas()).count).toBe(2);
    addObservation(find("quaking-aspen"));
    expect(quest("three-trees-one-outing").progress(getAtlas()).done).toBe(true);
  });

  it("count the needles needs a two, a three and a five", () => {
    ["lodgepole-pine", "pinyon-pine", "ponderosa-pine"].forEach((s) => addObservation(find(s)));
    expect(quest("count-the-needles").progress(getAtlas()).count).toBe(2);
    addObservation(find("limber-pine"));
    expect(quest("count-the-needles").progress(getAtlas()).done).toBe(true);
  });

  it("summer wildflowers only counts June to August finds", () => {
    addObservation(find("fireweed", "2026-07-10T16:00:00Z"));
    addObservation(find("yarrow", "2026-10-10T16:00:00Z"));
    addObservation(find("ponderosa-pine", "2026-07-10T16:00:00Z")); // not a flower
    expect(quest("summer-wildflowers").progress(getAtlas()).count).toBe(1);
  });

  it("deleting a find rolls progress back", () => {
    const o = addObservation(find("moss-campion"));
    expect(quest("above-treeline").progress(getAtlas()).done).toBe(true);
    removeObservation(o.id);
    expect(quest("above-treeline").progress(getAtlas()).done).toBe(false);
  });

  it("new ground counts finished trail outings only", () => {
    const a = startOuting("trail:greenmtn");
    expect(quest("new-ground").progress(getAtlas()).count).toBe(0);
    endOuting(a.id);
    const b = startOuting("color:kenosha-pass");
    endOuting(b.id);
    expect(quest("new-ground").progress(getAtlas()).count).toBe(1);
  });

  it("every quest reports a sane target", () => {
    QUESTS.forEach((q) => {
      const p = q.progress(getAtlas());
      expect(p.target).toBeGreaterThan(0);
      expect(p.count).toBe(0);
    });
  });
});

describe("iNaturalist client", () => {
  const ok = (body: unknown) => vi.fn(async () => ({ ok: true, json: async () => body }) as Response);

  it("parses a taxon, strips the HTML summary and caches it", async () => {
    const f = ok({ results: [{ id: 54840, name: "Populus tremuloides", preferred_common_name: "quaking aspen",
      wikipedia_summary: "<i><b>Populus tremuloides</b></i> is a deciduous tree &amp; more", wikipedia_url: "http://en.wikipedia.org/wiki/Populus_tremuloides",
      default_photo: { square_url: "https://x/square.jpg", medium_url: "https://x/medium.jpg", attribution: "(c) A. Person", license_code: "cc-by-nc" } }] });
    const t = await fetchTaxon(54840, f as unknown as typeof fetch);
    expect(t).toMatchObject({ id: 54840, common: "quaking aspen", summary: "Populus tremuloides is a deciduous tree & more", wikipediaUrl: "https://en.wikipedia.org/wiki/Populus_tremuloides" });
    expect(t!.photo).toMatchObject({ medium: "https://x/medium.jpg", attribution: "(c) A. Person", license: "cc-by-nc" });
    await fetchTaxon(54840, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("returns null on network failure instead of inventing data", async () => {
    const f = vi.fn(async () => { throw new Error("offline"); });
    expect(await fetchTaxon(1, f as unknown as typeof fetch)).toBeNull();
    expect(await fetchMonths(1, f as unknown as typeof fetch)).toBeNull();
    expect(await fetchNearby(39, -105, 3, f as unknown as typeof fetch)).toBeNull();
  });

  it("reads the Colorado month histogram January first", async () => {
    const f = ok({ results: { month_of_year: { 1: 5, 2: 0, 3: 0, 4: 0, 5: 0, 6: 10, 7: 20, 8: 0, 9: 0, 10: 0, 11: 0, 12: 1 } } });
    expect(await fetchMonths(9, f as unknown as typeof fetch)).toEqual([5, 0, 0, 0, 0, 10, 20, 0, 0, 0, 0, 1]);
  });

  it("parses nearby species counts and skips malformed rows", () => {
    expect(parseNearby({ results: [{ count: 3, taxon: { id: 1, name: "Leucocrinum montanum", preferred_common_name: "common starlily" } }, { count: 1 }] }))
      .toEqual([{ taxonId: 1, name: "Leucocrinum montanum", common: "common starlily", count: 3, photo: null }]);
    expect(stripHtml("")).toBeNull();
  });
});

describe("tonight's sky (LOOKUP astronomy)", () => {
  it("gives an ordered sunset, darkness and sunrise for a Colorado site", () => {
    const t = tonightAt(37.7325, -105.512, new Date("2026-10-28T20:00:00Z"));
    expect(t.sunset).not.toBeNull();
    expect(t.sunset! < t.darkStart! && t.darkStart! < t.darkEnd! && t.darkEnd! < t.sunrise!).toBe(true);
    expect(t.illumination).toBeGreaterThanOrEqual(0);
    expect(t.illumination).toBeLessThanOrEqual(1);
    expect(t.moonFreeMinutes).toBeLessThanOrEqual((t.darkEnd! - t.darkStart!) / 60000 + 10);
  });
});
