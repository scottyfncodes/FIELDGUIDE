import { describe, expect, it } from "vitest";
import { TRAILS } from "../../src/data/trails";
import { AREAS } from "../../src/data/areas";
import * as GEO from "../../src/data/geography";
const { REGIONS, STATE } = GEO;
import { haversineMi } from "../../src/lib/geo";
import { seasonParses } from "../../src/lib/season";
import { diffBucket } from "../../src/lib/trails";

/* The dataset is hand-curated; these checks catch the typos that would put a
   trailhead in the wrong place or break the UI. */
describe("trail dataset", () => {
  it("has unique ids and unique names", () => {
    const ids = TRAILS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = TRAILS.map((t) => t.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("ids are URL-safe (they go in #trail=…)", () => {
    TRAILS.forEach((t) => expect(t.id, t.id).toMatch(/^[\w-]+$/));
  });

  it.each(TRAILS.map((t) => [t.id, t] as const))("%s has the required fields", (_, t) => {
    expect(t.name.trim()).not.toBe("");
    expect(t.th.trim()).not.toBe("");
    expect(t.vehicle.trim()).not.toBe("");
    expect(t.type.trim()).not.toBe("");
    expect(t.mi).toBeGreaterThan(0);
    expect(t.mi).toBeLessThan(30);
    expect(t.gain).toBeGreaterThanOrEqual(0);
    expect(t.gain).toBeLessThan(6000);
    expect(Number.isInteger(t.views) && t.views >= 1 && t.views <= 5).toBe(true);
    expect(seasonParses(t.prime)).toBe(true);
  });

  it("every trailhead is inside Colorado", () => {
    TRAILS.forEach((t) => {
      expect(t.lat, t.id).toBeGreaterThan(STATE.south);
      expect(t.lat, t.id).toBeLessThan(STATE.north);
      expect(t.lon, t.id).toBeGreaterThan(STATE.west);
      expect(t.lon, t.id).toBeLessThan(STATE.east);
    });
  });

  it("every trail belongs to a real area, within a sensible drive of its town", () => {
    TRAILS.forEach((t) => {
      const a = AREAS[t.area];
      expect(a, `${t.id} -> ${t.area}`).toBeDefined();
      expect(haversineMi(t.lat, t.lon, a.lat, a.lon), t.id).toBeLessThan(35);
    });
  });

  it("no two trailheads share coordinates unless they share a trailhead", () => {
    const seen = new Map<string, string>();
    TRAILS.forEach((t) => {
      const key = `${t.lat.toFixed(3)},${t.lon.toFixed(3)}`;
      expect(seen.get(key), `${t.id} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, t.id);
    });
  });

  it("difficulty labels all map to a known bucket", () => {
    const known = /^(Easy|Moderate|Hard|Very Hard)(–(Moderate|Hard))?( \(sand\))?$/;
    TRAILS.forEach((t) => {
      expect(t.diff, t.id).toMatch(known);
      expect(["Easy", "Moderate", "Hard", "Very Hard"]).toContain(diffBucket(t.diff));
    });
  });

  it("text fields carry no placeholder junk", () => {
    const junk = /\b(TODO|TBD|lorem|xxx|placeholder)\b|undefined|null/i;
    TRAILS.forEach((t) => Object.values(t).forEach((v) => {
      if (typeof v === "string") expect(v, t.id).not.toMatch(junk);
    }));
  });

  /* Regression guards for coordinates fixed in the v7 review */
  it("trailhead coordinates match their named trailheads", () => {
    const byId = Object.fromEntries(TRAILS.map((t) => [t.id, t]));
    // Castle Trail starts at the East TH in Morrison, not the West TH off Parmalee Gulch
    expect(byId.falcon.lon).toBeGreaterThan(-105.21);
    // Rainbow Lakes TH is well south of Brainard Lake (~40.08)
    expect(byId.rainbowlakes.lat).toBeLessThan(40.04);
    // Sand Canyon's lower TH is on Road G in McElmo Canyon
    expect(byId.sandcanyon.lat).toBeLessThan(37.36);
  });
});

describe("areas, regions, start points", () => {
  it("every area has a label, coordinates in Colorado and is used by a trail", () => {
    Object.entries(AREAS).forEach(([k, a]) => {
      expect(a.label, k).toBeTruthy();
      expect(a.lat > STATE.south && a.lat < STATE.north && a.lon > STATE.west && a.lon < STATE.east, k).toBe(true);
      expect(TRAILS.some((t) => t.area === k), `${k} has no trails`).toBe(true);
    });
  });

  it("every area is in exactly one region", () => {
    Object.keys(AREAS).forEach((k) => {
      expect(REGIONS.filter((r) => r.areas.includes(k)).length, k).toBe(1);
    });
    REGIONS.forEach((r) => r.areas.forEach((a) => expect(AREAS[a], `${r.key}:${a}`).toBeDefined()));
  });

  it("après spots have names", () => {
    Object.entries(AREAS).forEach(([k, a]) => [...(a.brew || []), ...(a.eat || [])].forEach((s) => {
      expect(s.n.trim(), k).not.toBe("");
    }));
  });

  it("there are no preset starting towns any more: discovery starts from the person's location or a search", () => {
    expect("START_PRESETS" in GEO).toBe(false);
  });
});
