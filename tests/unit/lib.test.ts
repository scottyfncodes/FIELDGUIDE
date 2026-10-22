import { describe, expect, it, vi } from "vitest";
import { TRAILS } from "../../src/data/trails";
import { AREAS } from "../../src/data/areas";
import { START_PRESETS } from "../../src/data/geography";
import { directionsUrl, driveMin, fmtDrive, haversineMi, ringMiles, sunTimes } from "../../src/lib/geo";
import { inSeason } from "../../src/lib/season";
import {
  EMPTY_FILTERS, activeFilterCount, bookHours, diffBucket, filterTrails, fmtHours, inTimeBucket, matchesQuery, sortTrails,
} from "../../src/lib/trails";
import { fetchForecast, forecastUrl, isFresh, parseForecast, todayKey, verdict, wmo } from "../../src/lib/weather";
import { loadKey, saveKey } from "../../src/lib/storage";

const denver = START_PRESETS.find((p) => p.key === "denver")!;
const byId = (id: string) => TRAILS.find((t) => t.id === id)!;
const ctx = { areas: AREAS, log: {}, month: 9, verdictFor: () => null };

describe("geo", () => {
  it("haversine is right for a known pair (Denver → Colorado Springs ≈ 63 mi)", () => {
    expect(haversineMi(39.7392, -104.9903, 38.8339, -104.8214)).toBeCloseTo(63, 0);
  });
  it("drive estimates are monotonic and formatted for people", () => {
    const golden = driveMin(denver, { lat: 39.7555, lon: -105.2211 })!;
    const durango = driveMin(denver, { lat: 37.2753, lon: -107.8801 })!;
    expect(golden).toBeLessThan(durango);
    expect(fmtDrive(golden)).toMatch(/min$/);
    expect(fmtDrive(durango)).toMatch(/hr/);
    expect(fmtDrive(null)).toBe("–");
    expect(fmtDrive(118)).toBe("2 hr"); // rounds up across the hour cleanly
    expect(fmtDrive(2)).toBe("5 min");
  });
  it("drive rings agree with the drive model", () => {
    const mi = ringMiles(2);
    const edge = { lat: denver.lat + mi / 69, lon: denver.lon };
    expect(driveMin(denver, edge)).toBeCloseTo(120, -1);
  });
  it("sunrise comes before sunset in Denver", () => {
    const s = sunTimes(39.74, -104.99, new Date("2026-06-21T18:00:00Z"))!;
    expect(s.rise).toMatch(/5:3\d/);
    expect(s.set).toMatch(/8:3\d/);
  });
  it("directions link to exact coordinates", () => {
    expect(directionsUrl(39.1, -106.2)).toBe("https://www.google.com/maps/dir/?api=1&destination=39.1,-106.2&travelmode=driving");
  });
});

describe("season parsing", () => {
  it.each([
    ["Jul–Sep", 8, true], ["Jul–Sep", 10, false],
    ["Mar–Jun, Sep–Nov", 10, true], ["Mar–Jun, Sep–Nov", 7, false],
    ["Sep–May", 1, true], ["Sep–May", 7, false],
    ["Year-round (snowfield lingers)", 1, true],
    ["Jul (wildflowers)–Sep", 8, true],
    ["Late Jun–Jul (flowers), late Sep (gold)", 9, true],
    ["Late Jun–Jul (flowers), late Sep (gold)", 8, false],
    ["whenever", 3, true], // unreadable text never hides a trail
    [undefined, 3, true],
  ] as const)("%s in month %i → %s", (prime, m, want) => {
    expect(inSeason(prime as string | undefined, m)).toBe(want);
  });
});

describe("trail helpers", () => {
  it("buckets the descriptive difficulty labels", () => {
    expect(diffBucket("Easy–Moderate")).toBe("Moderate");
    expect(diffBucket("Moderate–Hard")).toBe("Hard");
    expect(diffBucket("Moderate (sand)")).toBe("Moderate");
    expect(diffBucket("Very Hard")).toBe("Very Hard");
    expect(diffBucket("")).toBe("Easy");
  });
  it("book time uses round-trip miles when the listed figure is one-way", () => {
    expect(bookHours({ mi: 6, gain: 2000 })).toBe(4);
    expect(bookHours(byId("incline"))).toBeGreaterThan(2.5); // 0.9 mi up + the Barr Trail descent
    expect(fmtHours(0.3)).toBe("15 min");
    expect(fmtHours(3.3)).toBe("3.5 hr");
    expect(fmtHours(4)).toBe("4 hr");
  });
  it("time buckets partition every trail exactly once", () => {
    TRAILS.forEach((t) => {
      expect((["short", "half", "long"] as const).filter((b) => inTimeBucket(t, b)).length).toBe(1);
    });
  });
  it("search matches names, towns and trailheads, ignoring case, accents and apostrophes", () => {
    expect(matchesQuery(byId("stmarys"), AREAS.idahosprings, "st marys")).toBe(true);
    expect(matchesQuery(byId("devilshead"), AREAS.sedalia, "devils")).toBe(true);
    expect(matchesQuery(byId("sevenbridges"), AREAS.springs, "canon")).toBe(true);
    expect(matchesQuery(byId("maroon"), AREAS.aspen, "ASPEN crater")).toBe(true);
    expect(matchesQuery(byId("maroon"), AREAS.aspen, "durango")).toBe(false);
  });
  it("filters combine", () => {
    const easyShort = filterTrails(TRAILS, { ...EMPTY_FILTERS, diff: "Easy", time: "short" }, ctx);
    expect(easyShort.length).toBeGreaterThan(0);
    easyShort.forEach((t) => { expect(diffBucket(t.diff)).toBe("Easy"); expect(bookHours(t)).toBeLessThan(2); });
    const notDone = filterTrails(TRAILS, { ...EMPTY_FILTERS, notDone: true }, { ...ctx, log: { gog: { done: true } } });
    expect(notDone.find((t) => t.id === "gog")).toBeUndefined();
    expect(notDone.length).toBe(TRAILS.length - 1);
    const winter = filterTrails(TRAILS, { ...EMPTY_FILTERS, seasonOnly: true }, { ...ctx, month: 1 });
    expect(winter.map((t) => t.id)).not.toContain("bierstadt");
    expect(winter.map((t) => t.id)).toContain("ntable");
    const good = filterTrails(TRAILS, { ...EMPTY_FILTERS, goodWx: true }, { ...ctx, verdictFor: (t) => (t.id === "gog" ? "GOOD" : "POOR") });
    expect(good.map((t) => t.id)).toEqual(["gog"]);
    expect(activeFilterCount({ ...EMPTY_FILTERS, q: "  ", diff: "Hard", notDone: true })).toBe(2);
  });
  it("sorts by drive, views, length and climbing", () => {
    const near = sortTrails(TRAILS, "near", denver);
    expect(driveMin(denver, near[0])!).toBeLessThanOrEqual(driveMin(denver, near[near.length - 1])!);
    expect(sortTrails(TRAILS, "views", denver)[0].views).toBe(5);
    const short = sortTrails(TRAILS, "short", denver);
    expect(bookHours(short[0])).toBeLessThanOrEqual(bookHours(short[1]));
    expect(sortTrails(TRAILS, "easy", denver)[0].gain).toBe(Math.min(...TRAILS.map((t) => t.gain)));
  });
});

describe("weather", () => {
  it("verdict thresholds", () => {
    expect(verdict(null)).toBeNull();
    expect(verdict({ hi: 70, lo: 40, wind: 10, precip: 10, summary: "" })).toBe("GOOD");
    expect(verdict({ hi: 70, lo: 40, wind: 22, precip: 10, summary: "" })).toBe("FAIR");
    expect(verdict({ hi: 70, lo: 40, wind: 10, precip: 60, summary: "" })).toBe("POOR");
    expect(verdict({ hi: 12, lo: 0, wind: 5, precip: 0, summary: "" })).toBe("POOR");
  });
  it("wmo codes", () => {
    expect(wmo(0)).toBe("Clear");
    expect(wmo(95)).toBe("Thunderstorms");
    expect(wmo(undefined)).toBe("Mixed conditions");
  });
  it("one request covers every trailhead", () => {
    const url = new URL(forecastUrl(TRAILS));
    expect(url.searchParams.get("latitude")!.split(",")).toHaveLength(TRAILS.length);
    expect(url.searchParams.get("timezone")).toBe("America/Denver");
  });
  it("parses batched responses and skips holes instead of inventing numbers", () => {
    const day = (hi: number) => ({ daily: { temperature_2m_max: [hi], temperature_2m_min: [40], wind_speed_10m_max: [8], wind_gusts_10m_max: [21.4], precipitation_probability_max: [5], weather_code: [1] } });
    const two = TRAILS.slice(0, 3);
    const out = parseForecast([day(71.6), {}, day(80)], two);
    expect(out[two[0].id]).toEqual({ hi: 72, lo: 40, wind: 21, precip: 5, summary: "Partly cloudy" });
    expect(out[two[1].id]).toBeUndefined();
    expect(out[two[2].id].hi).toBe(80);
    // a single-location response is an object, not an array
    expect(parseForecast(day(50), TRAILS.slice(0, 1))[TRAILS[0].id].hi).toBe(50);
  });
  it("fetchForecast surfaces HTTP failures", async () => {
    const bad = vi.fn(async () => new Response("nope", { status: 503 }));
    await expect(fetchForecast(TRAILS, bad as unknown as typeof fetch)).rejects.toThrow(/503/);
  });
  it("a cached forecast only counts for the same Colorado day and 3 hours", () => {
    const now = Date.parse("2026-07-04T15:00:00Z");
    const p = { ts: now - 60 * 60 * 1000, day: todayKey(new Date(now)), byTrail: {} };
    expect(isFresh(p, now)).toBe(true);
    expect(isFresh({ ...p, ts: now - 4 * 60 * 60 * 1000 }, now)).toBe(false);
    expect(isFresh({ ...p, day: "2026-07-03" }, now)).toBe(false);
    expect(isFresh(null, now)).toBe(false);
  });
});

describe("storage", () => {
  it("round-trips JSON and survives a throwing localStorage", () => {
    expect(saveKey("k", { a: 1 })).toBe(true);
    expect(loadKey("k")).toEqual({ a: 1 });
    window.localStorage.setItem("bad", "{not json");
    expect(loadKey("bad")).toBeNull();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    expect(saveKey("k", 1)).toBe(false);
    spy.mockRestore();
  });
});
