import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCATE_MESSAGE, ROUGH_ACCURACY_M, locate } from "../../src/lib/locate";
import { _resetThrottle, dedupeResults, geocode, parseNominatim, parsePhoton } from "../../src/lib/geocode";
import {
  COLORADO, MAX_PER_SOURCE, arcgisQuery, bboxAround, fetchCotrex, fetchOsm, fetchUsfs, overpassQuery, parseCotrex, parseOverpass, parseUsfs,
} from "../../src/lib/trailSources";
import type { Segment } from "../../src/lib/trailSources";
import {
  _clearDiscovery, attachTrailheads, buildTrail, climbFt, connectedPieces, dedupeTrails, difficultyText, discover, foundById, gradeText,
  matchAtlas, nameKey, resample, seasonText, trailsFromSegments,
} from "../../src/lib/discover";
import { TRAILS } from "../../src/data/trails";
import { cotrexFeatures, cotrexTrailheads, nominatimResults, overpassElements, sourceResponse, usfsFeatures } from "../fixtures/sources";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const origin = { lat: 40.0, lon: -105.28, label: "Boulder", kind: "place" as const };

describe("locate: device location, asked for only on request", () => {
  const geo = (fn: (ok: PositionCallback, err: PositionErrorCallback) => void) => ({ getCurrentPosition: fn });
  it("returns the fix with its accuracy", async () => {
    const r = await locate(geo((ok) => ok({ coords: { latitude: 39.7, longitude: -105.1, accuracy: 12.4 }, timestamp: 5 } as GeolocationPosition)), true);
    expect(r).toEqual({ ok: true, lat: 39.7, lon: -105.1, acc: 12, at: 5 });
  });
  it.each([[1, "denied"], [2, "unavailable"], [3, "timeout"]] as const)("maps error code %i to %s, with advice to type a place", async (code, reason) => {
    const r = await locate(geo((_ok, err) => err({ code } as GeolocationPositionError)), true);
    expect(r).toEqual({ ok: false, reason });
    expect(LOCATE_MESSAGE[reason]).toMatch(/address or place/i);
  });
  it("is unsupported without the API and refuses on insecure pages", async () => {
    expect(await locate(undefined, true)).toEqual({ ok: false, reason: "unsupported" });
    expect(await locate(geo(() => {}), false)).toEqual({ ok: false, reason: "insecure" });
  });
  it("gives up when Safari never calls back", async () => {
    vi.useFakeTimers();
    const p = locate(geo(() => {}), true);
    vi.advanceTimersByTime(21_000);
    expect(await p).toEqual({ ok: false, reason: "timeout" });
  });
  it("a cell-tower fix is flagged as rough", () => { expect(ROUGH_ACCURACY_M).toBeLessThanOrEqual(5000); });
});

describe("geocode: Nominatim first, Photon if refused, cached, never guessed", () => {
  beforeEach(() => _resetThrottle());

  it("parses Nominatim results into a label and an address line", () => {
    const r = parseNominatim(nominatimResults());
    expect(r[0]).toMatchObject({ label: "Boulder", detail: "Boulder County, Colorado", lat: 40.0149856, kind: "city", source: "nominatim" });
    expect(parseNominatim([{ lat: "x", lon: "1", display_name: "bad" }, null])).toEqual([]);
    expect(parseNominatim({})).toEqual([]);
  });

  it("parses Photon and drops results outside the US, Canada and Mexico", () => {
    const r = parsePhoton({ features: [
      { properties: { name: "Maroon Bells", state: "Colorado", countrycode: "US", osm_type: "N", osm_id: 1, osm_value: "peak", type: "other" }, geometry: { coordinates: [-106.98, 39.07] } },
      { properties: { name: "Paris", countrycode: "FR" }, geometry: { coordinates: [2.3, 48.8] } },
    ] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ label: "Maroon Bells", lat: 39.07, lon: -106.98, kind: "peak", source: "photon" });
  });

  it("drops the same place listed twice", () => {
    const a = parseNominatim(nominatimResults());
    expect(dedupeResults([...a, { ...a[0], id: "other" }])).toHaveLength(2);
  });

  it("falls back to Photon when Nominatim says too many requests", async () => {
    const f = vi.fn((url: string) => url.includes("nominatim")
      ? json("slow down", 429)
      : json({ features: [{ properties: { name: "Estes Park", countrycode: "US", type: "city" }, geometry: { coordinates: [-105.52, 40.38] } }] }));
    const out = await geocode("Estes Park", { fetchImpl: f as unknown as typeof fetch, noThrottle: true, online: true });
    expect(out).toMatchObject({ status: "ok", results: [{ label: "Estes Park", source: "photon" }] });
  });

  it("reports rate limiting, empty results and being offline as different things", async () => {
    const both429 = vi.fn(() => json("no", 429));
    expect(await geocode("Somewhere", { fetchImpl: both429 as unknown as typeof fetch, noThrottle: true, online: true })).toEqual({ status: "error", kind: "rate" });
    const empty = vi.fn(() => json([]));
    expect(await geocode("Qqqqzz", { fetchImpl: empty as unknown as typeof fetch, noThrottle: true, online: true })).toEqual({ status: "empty" });
    expect(await geocode("Lyons", { online: false })).toEqual({ status: "error", kind: "offline" });
    const down = vi.fn(() => Promise.reject(new TypeError("network")));
    expect(await geocode("Nederland", { fetchImpl: down as unknown as typeof fetch, noThrottle: true, online: true })).toEqual({ status: "error", kind: "unavailable" });
  });

  it("answers a repeat search from the device cache", async () => {
    const f = vi.fn(() => json(nominatimResults()));
    await geocode("Boulder CO", { fetchImpl: f as unknown as typeof fetch, noThrottle: true, online: true });
    const again = await geocode("  boulder   co ", { fetchImpl: f as unknown as typeof fetch, noThrottle: true, online: true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(again.status).toBe("ok");
  });

  it("waits a second between Nominatim requests", async () => {
    vi.useFakeTimers();
    const f = vi.fn(() => json(nominatimResults()));
    await geocode("Lyons CO", { fetchImpl: f as unknown as typeof fetch, online: true });
    const second = geocode("Jamestown CO", { fetchImpl: f as unknown as typeof fetch, online: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(700);
    await second;
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("trail sources: parsing what each service returns", () => {
  it("COTREX segments keep name, manager, uses, elevation and source id; unnamed or empty ones are dropped", () => {
    const segs = parseCotrex([...cotrexFeatures(0), { attributes: { name: " " }, geometry: { paths: [[[-105, 40], [-105.1, 40.1]]] } }, { attributes: { name: "No line" }, geometry: { paths: [] } }]);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ source: "cotrex", sourceId: "1001", name: "Mesa Trail", dogs: "leashed", elevMinM: 1700.2, lengthMi: 0.7, access: null });
    expect(segs[0].paths[0][0]).toEqual([39.99, -105.282]); // [lat, lon], flipped from ArcGIS x/y
  });

  it("USFS names are title-cased and trail class is kept as the official 1–5 scale", () => {
    const [s] = parseUsfs(usfsFeatures());
    expect(s).toMatchObject({ source: "usfs", name: "Mesa Trail", trailClass: "3", hikerSeason: "06/01-10/31", accessibility: "NOT ACCESSIBLE", trailNo: "123" });
  });

  it("OSM ways keep SAC scale and dog rules; the query excludes sidewalks and private paths", () => {
    const segs = parseOverpass({ elements: [...overpassElements(), { type: "node", id: 1 }, { type: "way", id: 3, tags: {}, geometry: [] }] });
    expect(segs.map((s) => s.name)).toEqual(["Mesa Trail", "Skunk Canyon Trail"]);
    expect(segs[1]).toMatchObject({ sourceId: "way/222", sacScale: "mountain_hiking", dogs: "leashed" });
    const q = overpassQuery(bboxAround(40, -105.28, 5));
    expect(q).toMatch(/sidewalk\|crossing/);
    expect(q).toMatch(/private\|no/);
  });

  it("ArcGIS queries page with resultOffset until the server stops saying there is more", async () => {
    const pages = [{ features: Array(1000).fill({ attributes: {} }), exceededTransferLimit: true }, { features: Array(1000).fill({ attributes: {} }), exceededTransferLimit: true }, { features: [{ attributes: {} }], exceededTransferLimit: false }];
    const urls: string[] = [];
    const f = vi.fn((url: string) => { urls.push(url); return json(pages[urls.length - 1]); });
    const all = await arcgisQuery("https://x/MapServer/40", "1=1", ["name"], COLORADO, f as unknown as typeof fetch, { orderBy: "OBJECTID" });
    expect(all).toHaveLength(2001);
    expect(urls.map((u) => new URL(u).searchParams.get("resultOffset"))).toEqual(["0", "1000", "2000"]);
    expect(urls[0]).toContain("orderByFields=OBJECTID");
  });

  it("a dense area narrows the box (nearest first) instead of dropping arbitrary records", async () => {
    const seen: string[] = [];
    const f = vi.fn((url: string) => {
      if (url.includes("returnCountOnly")) { seen.push(new URL(url).searchParams.get("geometry")!); return json({ count: seen.length === 1 ? MAX_PER_SOURCE * 3 : 50 }); }
      return json({ features: url.includes("/29/") ? cotrexTrailheads() : cotrexFeatures(0) });
    });
    const r = await fetchCotrex(40, -105.28, 50, f as unknown as typeof fetch);
    expect(r.status).toBe("ok");
    expect(r.limitedToMi).toBe(25);
    expect(r.trailheads).toHaveLength(1);
  });

  it("skips sources that don't cover the search area", async () => {
    const f = vi.fn();
    expect((await fetchCotrex(43.48, -110.76, 10, f as unknown as typeof fetch)).status).toBe("skipped"); // Jackson, WY
    expect((await fetchUsfs(51.18, -115.57, 10, f as unknown as typeof fetch)).status).toBe("skipped"); // Banff, AB
    expect(f).not.toHaveBeenCalled();
  });

  it("a source that fails says so instead of returning nothing silently", async () => {
    const f = vi.fn(() => json({ error: { code: 500, message: "boom" } }));
    expect((await fetchUsfs(40, -105.28, 10, f as unknown as typeof fetch)).status).toBe("error");
    const g = vi.fn(() => Promise.reject(new TypeError("network")));
    expect((await fetchOsm(40, -105.28, 10, g as unknown as typeof fetch)).status).toBe("error");
  });
});

describe("discovery: segments become trails, deduped and ranked", () => {
  beforeEach(() => _clearDiscovery());
  const seg = (over: Partial<Segment>): Segment => ({ source: "cotrex", sourceId: "s", name: "Mesa Trail", manager: "OSMP", paths: [[[40, -105], [40.001, -105.001]]], lengthMi: 0.1, ...over });

  it("normalizes names so the same trail matches across sources", () => {
    expect(nameKey("MESA TRAIL")).toBe(nameKey("Mesa Trail"));
    expect(nameKey("Mount Sanitas Trail #123")).toBe(nameKey("Mt. Sanitas"));
    expect(nameKey("Trail")).toBe("");
  });

  it("keeps two same-named trails apart when they don't connect", () => {
    const near = seg({ sourceId: "a" }), touching = seg({ sourceId: "b", paths: [[[40.001, -105.001], [40.003, -105.002]]] });
    const far = seg({ sourceId: "c", paths: [[[40.5, -105.5], [40.501, -105.5]]] });
    const pieces = connectedPieces([near, touching, far]);
    expect(pieces.map((p) => p.map((s) => s.sourceId).sort())).toEqual(expect.arrayContaining([["a", "b"], ["c"]]));
    expect(trailsFromSegments([near, touching, far], { lat: 40, lon: -105 })).toHaveLength(2);
  });

  it("adds up mapped length and reports the elevation range in feet", () => {
    const t = buildTrail(parseCotrex(cotrexFeatures(0)), { lat: 40, lon: -105.28 });
    expect(t.mappedMi).toBe(1.1);
    expect(t.elevMinFt).toBe(Math.round(1680 * 3.28084));
    expect(t.elevMaxFt).toBe(Math.round(1790.5 * 3.28084));
    expect(t.sources.map((s) => s.id)).toEqual(["1001", "1002"]);
  });

  it("one trail in three sources is one card that keeps every source id and fills gaps from the others", () => {
    const segs = [...parseCotrex(cotrexFeatures(0)), ...parseUsfs(usfsFeatures()), ...parseOverpass({ elements: overpassElements() })];
    const trails = dedupeTrails(trailsFromSegments(segs, origin));
    const mesa = trails.filter((t) => t.name === "Mesa Trail");
    expect(mesa).toHaveLength(1);
    expect(mesa[0].primary).toBe("cotrex");
    expect(mesa[0].sources.map((s) => s.source)).toEqual(["cotrex", "cotrex", "usfs", "osm"]);
    expect(mesa[0]).toMatchObject({ trailClass: "3", sacScale: "hiking", surface: "dirt", hikerSeason: "06/01-10/31" });
    expect(trails.find((t) => t.name === "Skunk Canyon Trail")!.sources).toEqual([{ source: "osm", id: "way/222" }]);
  });

  it("doesn't merge same-named trails that are far apart", () => {
    const a = buildTrail([seg({ sourceId: "x" })], origin), b = buildTrail([seg({ source: "osm", sourceId: "y", paths: [[[41, -106], [41.001, -106]]] })], origin);
    expect(dedupeTrails([a, b])).toHaveLength(2);
  });

  it("attaches a trailhead only when it sits on the trail", () => {
    const [mesa] = trailsFromSegments(parseCotrex(cotrexFeatures(0)), origin);
    const far = { ...cotrexTrailheads()[0].attributes, source: "cotrex" as const, sourceId: "far", name: "Elsewhere TH", lat: 40.2, lon: -105.5, manager: null, fee: null, water: null, bathrooms: null };
    const on = { source: "cotrex" as const, sourceId: "on", name: "South Mesa Trailhead", lat: 39.9901, lon: -105.2821, manager: null, fee: "no", water: "yes", bathrooms: "yes" };
    expect(attachTrailheads([mesa], [far], origin)[0].trailhead).toBeNull();
    expect(attachTrailheads([mesa], [far, on], origin)[0].trailhead!.name).toBe("South Mesa Trailhead");
  });

  it("links a found trail to the curated atlas entry it matches, by name and place", () => {
    const royal = TRAILS.find((t) => t.id === "royal-arch")!;
    const found = buildTrail([seg({ name: "Royal Arch Trail", paths: [[[royal.lat, royal.lon], [royal.lat + 0.005, royal.lon - 0.003]]] })], origin);
    const elsewhere = buildTrail([seg({ name: "Royal Arch Trail", sourceId: "z", paths: [[[38, -107], [38.001, -107]]] })], origin);
    const { trails, unmatched } = matchAtlas([found, elsewhere], [royal]);
    expect(trails[0].atlasId).toBe("royal-arch");
    expect(trails[0].sources[0]).toEqual({ source: "atlas", id: "royal-arch" });
    expect(trails[1].atlasId).toBeNull();
    expect(unmatched).toEqual([]);
  });

  it("a whole search: every source queried, results inside the radius, nearest first, retrievable by id", async () => {
    const f = vi.fn((url: string) => json(sourceResponse(url)));
    const r = await discover(origin, 10, TRAILS, f as unknown as typeof fetch);
    expect(r.status).toEqual({
      cotrex: { status: "ok", count: 26, limitedToMi: undefined },
      usfs: { status: "ok", count: 1, limitedToMi: undefined },
      osm: { status: "ok", count: 2, limitedToMi: undefined },
    });
    expect(r.trails.every((t) => t.nearest.mi <= 10)).toBe(true);
    const d = r.trails.map((t) => t.nearest.mi);
    expect(d).toEqual([...d].sort((a, b) => a - b));
    expect(foundById(r.trails[0].id)).toBe(r.trails[0]);
    expect(new Set(r.trails.map((t) => t.id)).size).toBe(r.trails.length);
    /* curated classics in range that no source matched are listed separately, not invented as found trails */
    expect(r.atlas.every((a) => a.mi <= 10)).toBe(true);
  });

  it("when every source fails the result says so; nothing is made up", async () => {
    const f = vi.fn(() => Promise.reject(new TypeError("offline")));
    const r = await discover({ ...origin, lat: 38.5 }, 5, [], f as unknown as typeof fetch);
    expect(r.trails).toEqual([]);
    expect(Object.values(r.status).map((s) => s.status)).toEqual(["error", "error", "error"]);
  });
});

describe("presentation helpers label what a value is", () => {
  it("season, grade and difficulty text", () => {
    expect(seasonText("06/01-10/31")).toBe("Jun 1 to Oct 31");
    expect(seasonText("01/01-12/31")).toBe("year-round");
    expect(seasonText(null)).toBeNull();
    expect(gradeText("TG05 - +12-20%")).toBe("12–20%");
    expect(difficultyText({ trailClass: "2", sacScale: null })).toMatch(/trail class 2 of 5/i);
    expect(difficultyText({ trailClass: null, sacScale: "demanding_mountain_hiking" })).toBe("SAC T3: demanding mountain hiking");
    expect(difficultyText({ trailClass: null, sacScale: null })).toBeNull();
  });

  it("climb from sampled elevations ignores small wiggle", () => {
    expect(climbFt([100, 101, 102, 110, 105, 120])).toEqual({ up: Math.round(25 * 3.28084), down: Math.round(5 * 3.28084) });
  });

  it("resamples a line evenly by distance", () => {
    const pts = resample([[40, -105], [40, -104.9]], 5);
    expect(pts).toHaveLength(5);
    expect(pts[2][1]).toBeCloseTo(-104.95, 4);
  });
});
