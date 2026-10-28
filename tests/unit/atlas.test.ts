import { beforeEach, describe, expect, it } from "vitest";
import {
  ATLAS_KEY, EMPTY_ATLAS, activeOuting, addObservation, collection, endOuting, getAtlas, reloadAtlas,
  removeObservation, removeOuting, sanitize, startOuting, toggleSaved, updateObservation,
} from "../../src/lib/atlas";
import type { NewObservation } from "../../src/lib/atlas";
import { detectSource, importLeafHunter, importLookup } from "../../src/lib/importers";
import { PLACES, placeByRef } from "../../src/lib/places";
import { SPECIES } from "../../src/data/species";
import { LOG_KEY } from "../../src/lib/storage";
import { TRAILS } from "../../src/data/trails";
import { COLORADO_LOCATIONS } from "../../src/data/foliage";
import { SITES } from "../../src/data/darksky";

const find = (speciesId: string | null, extra: Partial<NewObservation> = {}): NewObservation => ({
  kind: "find", speciesId, candidates: [], idMethod: speciesId ? "guide" : "none", placeRef: null,
  note: "", photoId: null, thumb: null, coords: null, ...extra,
});

beforeEach(() => reloadAtlas());

describe("places", () => {
  it("indexes every trail, fall-color spot and dark-sky site under a stable, unique ref", () => {
    expect(PLACES.length).toBe(TRAILS.length + COLORADO_LOCATIONS.length + SITES.length);
    expect(new Set(PLACES.map((p) => p.ref)).size).toBe(PLACES.length);
    expect(placeByRef("trail:greenmtn")?.name).toBe("Green Mountain Loop");
    expect(placeByRef("color:kenosha-pass")?.kind).toBe("color");
    expect(placeByRef("sky:great-sand-dunes")?.kind).toBe("sky");
    expect(placeByRef("trail:nope")).toBeUndefined();
  });
});

describe("observations and the collection", () => {
  it("keeps repeat finds as separate observations of one species record", () => {
    addObservation(find("quaking-aspen"));
    addObservation(find("quaking-aspen"));
    addObservation(find("blue-spruce"));
    const d = getAtlas();
    expect(d.observations).toHaveLength(3);
    const c = collection(d);
    expect(c.map((e) => e.speciesId).sort()).toEqual(["blue-spruce", "quaking-aspen"]);
    expect(c.find((e) => e.speciesId === "quaking-aspen")!.count).toBe(2);
  });

  it("does not put unidentified finds or leaf checks in the species collection", () => {
    addObservation(find(null));
    addObservation({ ...find(null), kind: "leafcheck", color: { percent: 80, status: "peak" } });
    expect(collection(getAtlas())).toHaveLength(0);
  });

  it("persists to localStorage and survives a reload", () => {
    addObservation(find("fireweed", { note: "burn scar" }));
    reloadAtlas();
    expect(getAtlas().observations[0].note).toBe("burn scar");
    expect(JSON.parse(window.localStorage.getItem(ATLAS_KEY)!).schema).toBe(1);
  });

  it("an identification can be set later and removed again", () => {
    const o = addObservation(find(null, { candidates: ["quaking-aspen", "water-birch"] }));
    updateObservation(o.id, { speciesId: "quaking-aspen", idMethod: "key" });
    expect(collection(getAtlas())).toHaveLength(1);
    removeObservation(o.id);
    expect(getAtlas().observations).toHaveLength(0);
  });
});

describe("outings", () => {
  it("finds made during an active outing join it and inherit its place", () => {
    const out = startOuting("trail:greenmtn");
    const o = addObservation(find("gambel-oak"));
    expect(o.outingId).toBe(out.id);
    expect(o.placeRef).toBe("trail:greenmtn");
    endOuting(out.id);
    expect(activeOuting(getAtlas())).toBeNull();
    expect(addObservation(find("gambel-oak")).outingId).toBeNull();
  });

  it("starting a second outing ends the first", () => {
    const a = startOuting("trail:greenmtn");
    startOuting("trail:ntable");
    expect(getAtlas().outings.find((o) => o.id === a.id)!.endedAt).not.toBeNull();
    expect(getAtlas().outings.filter((o) => !o.endedAt)).toHaveLength(1);
  });

  it("deleting an outing keeps its finds", () => {
    const out = startOuting("trail:greenmtn");
    addObservation(find("yarrow"));
    removeOuting(out.id);
    expect(getAtlas().observations).toHaveLength(1);
    expect(getAtlas().observations[0].outingId).toBeNull();
  });
});

describe("saved places", () => {
  it("toggles without duplicates", () => {
    toggleSaved("sky:great-sand-dunes");
    toggleSaved("trail:greenmtn");
    toggleSaved("sky:great-sand-dunes");
    expect(getAtlas().saved.map((s) => s.ref)).toEqual(["trail:greenmtn"]);
  });
});

describe("sanitize: stored data is untrusted", () => {
  it("returns an empty atlas for garbage", () => {
    expect(sanitize(null)).toEqual(EMPTY_ATLAS);
    expect(sanitize("{oops")).toEqual(EMPTY_ATLAS);
    window.localStorage.setItem(ATLAS_KEY, "{oops");
    reloadAtlas();
    expect(getAtlas()).toEqual(EMPTY_ATLAS);
  });

  it("drops unknown species and places, duplicate ids and dangling links instead of guessing", () => {
    const d = sanitize({
      observations: [
        { id: "a", speciesId: "not-a-species", placeRef: "trail:nowhere", outingId: "ghost", observedAt: "2026-07-01T10:00:00Z" },
        { id: "a", speciesId: "quaking-aspen" },
        { id: "b", speciesId: "quaking-aspen", placeRef: "trail:greenmtn", thumb: "javascript:alert(1)" },
      ],
      saved: [{ ref: "trail:greenmtn" }, { ref: "trail:greenmtn" }, { ref: "bogus" }],
      activeOutingId: "ghost",
    });
    expect(d.observations.map((o) => o.id)).toEqual(["a", "b"]);
    expect(d.observations[0]).toMatchObject({ speciesId: null, placeRef: null, outingId: null });
    expect(d.observations[1].thumb).toBeNull();
    expect(d.saved).toHaveLength(1);
    expect(d.activeOutingId).toBeNull();
  });

  it("never touches the CO Trail Atlas hiking log", () => {
    const log = { greenmtn: { done: true, rating: 4, notes: "windy" } };
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
    addObservation(find("yarrow", { placeRef: "trail:greenmtn" }));
    startOuting("trail:greenmtn");
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!)).toEqual(log);
  });
});

describe("importing Leaf Hunter data", () => {
  const file = {
    app: "leaf-hunter",
    reports: [
      { id: "rep-1", locationId: "kenosha-pass", observedAt: "2026-09-25T15:00:00Z", colorPercent: 85, status: "peak", note: "gold", source: "local", photo: "data:image/jpeg;base64,AAAA" },
      { id: "rep-2", locationId: "not-a-spot", observedAt: "2026-09-25T15:00:00Z", colorPercent: 40, status: "turning", source: "local" },
      { id: "demo-x-0", locationId: "kenosha-pass", observedAt: "2026-09-25T15:00:00Z", colorPercent: 40, status: "turning", source: "demo" },
    ],
    favorites: [{ locationId: "maroon-bells", addedAt: "2026-09-01T00:00:00Z", lastSeenPercent: 10, lastSeenAt: "2026-09-01T00:00:00Z" }],
  };

  it("brings in real leaf checks and saved spots, skipping demo reports and unknown spots", () => {
    expect(detectSource(file)).toBe("leaf-hunter");
    const r = importLeafHunter(getAtlas(), file);
    expect(r.added).toEqual({ observations: 1, saved: 1 });
    expect(r.skipped.unknownPlaces).toBe(1);
    const o = r.data.observations[0];
    expect(o).toMatchObject({ id: "lh-rep-1", kind: "leafcheck", placeRef: "color:kenosha-pass", color: { percent: 85, status: "peak" }, source: "leaf-hunter" });
    expect(r.photos).toEqual([{ obsId: "lh-rep-1", dataUrl: "data:image/jpeg;base64,AAAA" }]);
    expect(r.data.saved[0].ref).toBe("color:maroon-bells");
  });

  it("is idempotent", () => {
    const once = importLeafHunter(getAtlas(), file).data;
    const twice = importLeafHunter(once, file);
    expect(twice.added).toEqual({ observations: 0, saved: 0 });
    expect(twice.data.observations).toHaveLength(1);
    expect(twice.data.saved).toHaveLength(1);
  });

  it("keeps what was already in the atlas", () => {
    addObservation(find("quaking-aspen"));
    const r = importLeafHunter(getAtlas(), file);
    expect(r.data.observations).toHaveLength(2);
  });
});

describe("importing LOOKUP data", () => {
  it("saves the chosen dark-sky site and reports custom sites it can't bring over", () => {
    const prefs = { home: null, maxDriveMinutes: 180, redMode: true, selectedSiteId: "great-sand-dunes", customSites: [{ id: "c1" }] };
    expect(detectSource(prefs)).toBe("lookup");
    const r = importLookup(getAtlas(), prefs);
    expect(r.data.saved.map((s) => s.ref)).toEqual(["sky:great-sand-dunes"]);
    expect(r.skipped.unsupported[0]).toMatch(/1 custom site/);
    expect(importLookup(r.data, prefs).added.saved).toBe(0);
  });
});

describe("field guide data", () => {
  it("has unique ids, unique iNaturalist taxa and valid cross-links", () => {
    const ids = SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(SPECIES.map((s) => s.inat)).size).toBe(SPECIES.length);
    SPECIES.forEach((s) => s.similar.forEach((x) => expect(ids, `${s.id} -> ${x.id}`).toContain(x.id)));
  });

  it.each(SPECIES.map((s) => [s.id, s] as const))("%s is complete", (_, s) => {
    expect(s.idMarks.length).toBeGreaterThanOrEqual(2);
    expect(s.habitat.trim()).not.toBe("");
    expect(s.elevFt[0]).toBeLessThan(s.elevFt[1]);
    expect(s.look.length).toBeGreaterThan(0);
    s.look.forEach((l) => l.months.forEach((m) => expect(m).toBeGreaterThanOrEqual(1)));
    expect(s.groups.length).toBeGreaterThan(0);
    // copy guardrail: no em dashes in UI text
    [s.common, s.habitat, ...s.idMarks, ...s.facts, ...s.similar.map((x) => x.tell), s.caution ?? ""]
      .forEach((t) => expect(t).not.toMatch(/—/));
  });
});
