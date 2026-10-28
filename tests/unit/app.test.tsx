import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { TRAILS } from "../../src/data/trails";
import { LOG_KEY, START_KEY, WX_KEY } from "../../src/lib/storage";
import { todayKey } from "../../src/lib/weather";
import { _clearDiscovery } from "../../src/lib/discover";
import { _resetThrottle } from "../../src/lib/geocode";
import { sourceResponse } from "../fixtures/sources";
import { getAtlas, reloadAtlas } from "../../src/lib/atlas";

/* These tests drive the whole app through 10-30 real interactions each in
   jsdom. On a busy 2-4 CPU machine a full journey can need more than the
   5 s default even with the scoped queries below. */
vi.setConfig({ testTimeout: 15_000 });

/* Role queries over the whole document compute a role for each of its
   ~1,200 nodes (map, trail list), 300-500 ms apiece in jsdom. The helpers
   below are called many times per test, so they find the labelled trail
   list directly and scope their role queries to it. */
const trailList = () => document.querySelector<HTMLElement>('section[aria-label="Atlas classics"]')!;
const rows = () => trailList().querySelectorAll("li.row");
const openTrail = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  await user.click(within(trailList()).getAllByRole("button", { name }).find((b) => b.classList.contains("row-main"))!);
  return screen.getByRole("dialog");
};

/* every live source answers from the fixtures; the forecast hangs as usual */
function stubSources(opts: { geo?: "ok" | "fail" } = {}) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("nominatim") && opts.geo === "fail") return Promise.resolve(new Response("busy", { status: 429 }));
    if (url.includes("photon.komoot.io") && opts.geo === "fail") return Promise.resolve(new Response("busy", { status: 429 }));
    const body = sourceResponse(url, init as { body?: unknown });
    return body === undefined ? new Promise(() => {}) : Promise.resolve(new Response(JSON.stringify(body)));
  }));
  return calls;
}

describe("app boot", () => {
  it("renders the atlas with every trail, the map and the discovery controls", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: /co field atlas/i })).toBeTruthy();
    expect(rows().length).toBe(TRAILS.length);
    expect(screen.getByRole("application", { name: /map of colorado/i })).toBeTruthy();
    expect(document.querySelectorAll("g.mark").length).toBe(TRAILS.length);
    expect(screen.getByRole("searchbox", { name: /search the atlas classics/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /use my location/i })).toBeTruthy();
    expect(screen.getByLabelText(/address or place/i)).toBeTruthy();
    expect(screen.getByText(`/${TRAILS.length} hiked`, { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: /loading forecast/i })).toBeTruthy();
  });

  it("a saved search point comes back, and the classics group nearest first from it", async () => {
    window.localStorage.setItem(START_KEY, JSON.stringify({ key: "place", label: "Durango", lat: 37.2753, lon: -107.8801 }));
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("Durango", { selector: ".lp-from b" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /browse all \d+ atlas classics/i }));
    expect(document.querySelector(".group-hd")!.textContent).toMatch(/durango/i);
  });

  it("ignores corrupt saved data instead of crashing, and never invents a starting town", () => {
    window.localStorage.setItem(LOG_KEY, "{oops");
    window.localStorage.setItem(START_KEY, JSON.stringify({ lat: "x" }));
    render(<App />);
    expect(rows().length).toBe(TRAILS.length);
    expect(screen.queryByText(/Sloan's Lake|nearest to/)).toBeNull();
    expect(screen.getByRole("button", { name: /use my location/i })).toBeTruthy();
  });
});

describe("discovery", () => {
  it("search narrows the list and the map, and shows a recoverable empty state", async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = screen.getByRole("searchbox", { name: /search the atlas classics/i });
    await user.type(box, "falls");
    const names = [...rows()].map((r) => r.querySelector(".row-name")!.textContent);
    expect(names.length).toBeGreaterThan(2);
    names.forEach((n) => expect(n).toMatch(/falls/i));
    expect(document.querySelectorAll("g.mark").length).toBe(names.length);

    await user.clear(box);
    await user.type(box, "zzzz");
    expect(rows().length).toBe(0);
    expect(screen.getByText(/no classics match/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /show all/i }));
    expect(rows().length).toBe(TRAILS.length);
    expect((box as HTMLInputElement).value).toBe("");
  });

  it("difficulty + time filters combine and can be cleared in one tap", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Difficulty" }), "Easy");
    await user.selectOptions(screen.getByRole("combobox", { name: "Time on trail" }), "short");
    const n = rows().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(TRAILS.length);
    [...rows()].forEach((r) => expect(r.querySelector(".diff")!.className).toMatch(/diff-easy/));
    await user.click(screen.getByRole("button", { name: /clear 2 filters/i }));
    expect(rows().length).toBe(TRAILS.length);
  });

  it("region chips narrow to one part of the state and toggle off", async () => {
    const user = userEvent.setup();
    render(<App />);
    const regions = screen.getByRole("navigation", { name: /region/i });
    const rmnp = within(regions).getByRole("button", { name: /rocky mtn np/i });
    await user.click(rmnp);
    expect(rmnp.getAttribute("aria-pressed")).toBe("true");
    expect(rows().length).toBe(TRAILS.filter((t) => t.area === "estes").length);
    expect(screen.getByText(/in Rocky Mtn NP/)).toBeTruthy();
    await user.click(rmnp);
    expect(rows().length).toBe(TRAILS.length);
  });

  it("'not hiked yet' hides logged trails; sorting by views flattens the list", async () => {
    const user = userEvent.setup();
    render(<App />);
    const firstCheck = screen.getAllByRole("button", { name: /mark as hiked/i })[0];
    await user.click(firstCheck);
    await user.click(screen.getByRole("button", { name: /not hiked yet/i }));
    expect(rows().length).toBe(TRAILS.length - 1);
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "views");
    expect(document.querySelectorAll(".group-hd").length).toBe(0);
    expect(rows()[0].textContent).toMatch(/★ views/);
  });
});

describe("trail detail", () => {
  it("opens as a dialog with the essentials, and syncs the URL", async () => {
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openTrail(user, /Mount Bierstadt/);
    expect(within(dlg).getByRole("heading", { name: /Mount Bierstadt/ })).toBeTruthy();
    expect(within(dlg).getByText("7 mi")).toBeTruthy();
    expect(within(dlg).getByText("2,850 ft")).toBeTruthy();
    expect(within(dlg).getByText(/Strenuous/)).toBeTruthy();
    const dir = within(dlg).getByRole("link", { name: /directions/i }) as HTMLAnchorElement;
    expect(dir.href).toContain("destination=39.5966,-105.7108");
    expect(within(dlg).getByText(/lightning/)).toBeTruthy();
    expect(window.location.hash).toBe("#trail=bierstadt");
    expect(document.activeElement).toBe(within(dlg).getByRole("button", { name: /close/i }));
  });

  it("closes on Escape, on the back button, and via history", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTrail(user, /Sky Pond/);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openTrail(user, /Sky Pond/);
    await user.click(screen.getByRole("button", { name: /close trail details/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openTrail(user, /Sky Pond/);
    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deep links straight to a trail", () => {
    window.history.replaceState(null, "", "/#trail=hanging");
    render(<App />);
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Hanging Lake" })).toBeTruthy();
  });

  it("ignores a bogus deep link", () => {
    window.history.replaceState(null, "", "/#trail=nope");
    render(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("field log: hiked, rating and notes persist on this device", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    const dlg = await openTrail(user, /Chief Mountain/);
    await user.click(within(dlg).getByRole("button", { name: /mark as hiked/i }));
    await user.click(within(dlg).getByRole("button", { name: "4 stars" }));
    await user.type(within(dlg).getByLabelText(/trip notes/i), "Windy up top");
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!).chief).toEqual({ done: true, rating: 4, notes: "Windy up top" });
    unmount();

    render(<App />);
    expect(screen.getByText("1", { selector: ".tally b" })).toBeTruthy();
    const row = screen.getByRole("button", { name: "Hiked: Chief Mountain" });
    expect(row.getAttribute("aria-pressed")).toBe("true");
  });

  it("tapping the current rating clears it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const dlg = await openTrail(user, /Deer Mountain/);
    await user.click(within(dlg).getByRole("button", { name: "3 stars" }));
    await user.click(within(dlg).getByRole("button", { name: "3 stars" }));
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!).deer.rating).toBe(0);
  });
});

describe("forecast", () => {
  const payload = () => TRAILS.map((_, i) => ({
    daily: {
      temperature_2m_max: [i === 0 ? 99 : 68], temperature_2m_min: [41], wind_speed_10m_max: [6],
      wind_gusts_10m_max: [12], precipitation_probability_max: [10], weather_code: [0],
    },
  }));

  it("loads automatically, colors the trails and enables the good-weather filter", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload())));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(document.querySelectorAll("g.mark-good").length).toBe(TRAILS.length - 1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll("g.mark-poor").length).toBe(1);
    await user.click(screen.getByRole("button", { name: /good weather/i }));
    expect(rows().length).toBe(TRAILS.length - 1);
    expect(JSON.parse(window.localStorage.getItem(WX_KEY)!).day).toBe(todayKey());
  });

  it("uses a fresh cached forecast without refetching", () => {
    const byTrail = Object.fromEntries(TRAILS.map((t) => [t.id, { hi: 60, lo: 30, wind: 5, precip: 0, summary: "Clear" }]));
    window.localStorage.setItem(WX_KEY, JSON.stringify({ ts: Date.now(), day: todayKey(), byTrail }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelectorAll("g.mark-good").length).toBe(TRAILS.length);
  });

  it("a failed fetch leaves the app usable with a retry", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole("status").some((s) => /forecast/i.test(s.textContent ?? ""))).toBe(true));
    await waitFor(() => expect(screen.getByRole("button", { name: /load today's forecast/i }).textContent).toMatch(/retry/i));
    expect(rows().length).toBe(TRAILS.length);
    expect(screen.queryByRole("button", { name: /good weather/i })).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload()))));
    await user.click(screen.getByRole("button", { name: /load today's forecast/i }));
    await waitFor(() => expect(document.querySelectorAll("g.mark-good").length).toBeGreaterThan(0));
  });
});

describe("location-first discovery", () => {
  beforeEach(() => { _clearDiscovery(); _resetThrottle(); });

  it("asks for location only when tapped; a refusal is explained and lands on address entry", async () => {
    let asked = 0;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) => { asked++; err({ code: 1 }); } },
    });
    const user = userEvent.setup();
    render(<App />);
    expect(asked).toBe(0);
    await user.click(screen.getByRole("button", { name: /use my location/i }));
    expect(asked).toBe(1);
    expect((await screen.findByRole("alert")).textContent).toMatch(/location is turned off/i);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/address or place/i)));
    expect(window.localStorage.getItem(START_KEY)).toBeNull();
  });

  it("a location fix searches every source around it and lists real trails, merged and nearest first", async () => {
    const calls = stubSources();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 40.0, longitude: -105.28, accuracy: 25 }, timestamp: Date.now() }) },
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /use my location/i }));
    const list = await screen.findByRole("region", { name: "Trails near you" });
    await waitFor(() => expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(5));
    expect(calls.some((u) => u.includes("MapServer/40/query"))).toBe(true);
    expect(calls.some((u) => u.includes("EDW_TrailNFSPublish"))).toBe(true);
    expect(calls.some((u) => u.includes("overpass-api.de"))).toBe(true);
    const names = [...list.querySelectorAll(".row-name")].map((n) => n.textContent);
    /* Mesa Trail is in COTREX, USFS and OSM: one card, three sources */
    expect(names.filter((n) => n === "Mesa Trail")).toHaveLength(1);
    const mesa = [...list.querySelectorAll("li")].find((li) => li.querySelector(".row-name")?.textContent === "Mesa Trail")!;
    expect(mesa.querySelector(".row-src")!.textContent).toBe("COTREX + USFS + OpenStreetMap");
    const dist = [...list.querySelectorAll(".rows-flat .row-where")].map((w) => parseFloat(w.textContent!));
    expect(dist).toEqual([...dist].sort((a, b) => a - b));
    expect(within(list).getByText(/straight lines from/i)).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(START_KEY)!).key).toBe("gps");
  });

  it("pages long result lists instead of dumping them", async () => {
    stubSources();
    window.localStorage.setItem(START_KEY, JSON.stringify({ key: "place", label: "Boulder", lat: 40.0, lon: -105.28 }));
    const user = userEvent.setup();
    render(<App />);
    const list = await screen.findByRole("region", { name: "Trails near you" });
    const more = await within(list).findByRole("button", { name: /show \d+ more/i });
    expect(list.querySelectorAll(".rows-flat > li").length).toBe(20);
    await user.click(more);
    expect(list.querySelectorAll(".rows-flat > li").length).toBeGreaterThan(20);
  });

  it("typed places geocode; an ambiguous name offers choices; the pick becomes the search point", async () => {
    stubSources();
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/address or place/i), "Boulder");
    await user.click(screen.getByRole("button", { name: "Search" }));
    const pick = await screen.findByRole("button", { name: /University of Colorado Boulder/ });
    await user.click(pick);
    expect(JSON.parse(window.localStorage.getItem(START_KEY)!)).toMatchObject({ key: "place", lat: 40.0076, lon: -105.2659 });
    expect(screen.getByText(/University of Colorado Boulder/, { selector: ".lp-from b" })).toBeTruthy();
  });

  it("a failed address lookup says why and offers the way back", async () => {
    stubSources({ geo: "fail" });
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/address or place/i), "Estes Park");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/busy/i);
    expect(window.localStorage.getItem(START_KEY)).toBeNull();
  });

  it("a found trail opens with its sources, straight-line distance and directions, and can be saved", async () => {
    stubSources();
    window.localStorage.setItem(START_KEY, JSON.stringify({ key: "place", label: "Boulder", lat: 40.0, lon: -105.28 }));
    const user = userEvent.setup();
    render(<App />);
    const list = await screen.findByRole("region", { name: "Trails near you" });
    await user.click(await within(list).findByRole("button", { name: /^Mesa Trail/ }));
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByRole("heading", { name: "Mesa Trail" })).toBeTruthy();
    expect(within(dlg).getByText(/Trail class 3 of 5/)).toBeTruthy();
    expect(within(dlg).getByText(/in a straight line/)).toBeTruthy();
    const dir = within(dlg).getByRole("link", { name: /directions to south mesa trailhead/i }) as HTMLAnchorElement;
    expect(dir.href).toContain("destination=39.9901,-105.2821");
    await waitFor(() => expect(within(dlg).getByText(/up, one way along/)).toBeTruthy());
    await user.click(within(dlg).getByRole("button", { name: "Save trail" }));
    const saved = JSON.parse(window.localStorage.getItem("co-field-atlas-v1")!);
    expect(saved.found[0]).toMatchObject({ name: "Mesa Trail" });
    expect(saved.saved[0].ref).toMatch(/^found:/);
  });
});

describe("review fixes", () => {
  beforeEach(() => { _clearDiscovery(); _resetThrottle(); });

  it("a slow location fix that lands after the person typed a place doesn't replace it", async () => {
    stubSources();
    let late: ((p: unknown) => void) | null = null;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (ok: (p: unknown) => void) => { late = ok; } } });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /use my location/i }));
    await user.type(screen.getByLabelText(/address or place/i), "Boulder");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(await screen.findByRole("button", { name: /University of Colorado Boulder/ }));
    act(() => late!({ coords: { latitude: 37.27, longitude: -107.88, accuracy: 10 }, timestamp: Date.now() }));
    await new Promise((r) => setTimeout(r, 50));
    expect(JSON.parse(window.localStorage.getItem(START_KEY)!)).toMatchObject({ key: "place", lat: 40.0076 });
  });

  it("when a source fails and nothing is found, it says so instead of 'no trails here'", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("overpass")) return Promise.resolve(new Response("busy", { status: 504 }));
      if (/EDW_TrailNFSPublish|mapservices\.nps\.gov|gis\.blm\.gov/.test(url)) return Promise.resolve(new Response(JSON.stringify(url.includes("returnCountOnly") ? { count: 0 } : { features: [] })));
      return new Promise(() => {});
    }));
    window.localStorage.setItem(START_KEY, JSON.stringify({ key: "place", label: "Moab", lat: 38.57, lon: -109.55 }));
    render(<App />);
    const list = await screen.findByRole("region", { name: "Trails near you" });
    expect(await within(list).findByText(/not every source answered/i)).toBeTruthy();
    expect(within(list).getByText(/OpenStreetMap didn't respond/)).toBeTruthy();
    expect(within(list).queryByText(/No mapped trails within/)).toBeNull();
  });

  it("data saved by the previous build loads untouched: trail log, finds, saved places, last start", () => {
    const log = { greenmtn: { done: true, rating: 4, notes: "windy" } };
    const atlas = { schema: 1, activeOutingId: null, outings: [], saved: [{ ref: "color:kenosha-pass", savedAt: "2026-09-01T00:00:00.000Z" }],
      observations: [{ id: "obs-1", kind: "find", speciesId: "quaking-aspen", candidates: [], idMethod: "guide", placeRef: "trail:greenmtn", outingId: null,
        observedAt: "2026-09-20T15:00:00.000Z", note: "gold", photoId: null, thumb: null, coords: { lat: 39.69, lon: -105.14, acc: 8 }, source: "app" }] };
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
    window.localStorage.setItem("co-field-atlas-v1", JSON.stringify(atlas));
    window.localStorage.setItem(START_KEY, JSON.stringify({ key: "gps", label: "My location", lat: 39.75, lon: -105.05 }));
    reloadAtlas();
    render(<App />);
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!)).toEqual(log);
    expect(screen.getByText("1", { selector: ".tally b" })).toBeTruthy();
    expect(screen.getByText("Your last location", { selector: ".lp-from b" })).toBeTruthy();
    const a = getAtlas();
    expect(a.observations[0]).toMatchObject({ id: "obs-1", speciesId: "quaking-aspen", placeRef: "trail:greenmtn", note: "gold", coords: { lat: 39.69, lon: -105.14, acc: 8 } });
    expect(a.saved).toEqual(atlas.saved);
    expect(a.found).toEqual([]);
  });
});
