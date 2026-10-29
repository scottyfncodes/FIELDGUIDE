import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { ARTICLES, QUICK_REF, TRIAGE } from "../../src/data/safety/sos";
import type { TriageNode } from "../../src/data/safety/types";
import { SAFETY_SAVED_KEY, SITUATIONS, contextLinks, loadSaved, searchSafety, toggleSavedRef, triageNode } from "../../src/lib/safety";
import { STALE_MS, ageText, checkHazard, isStale, parseAlerts, parseFacilities, parseQuakes } from "../../src/lib/hazards";

/* Safety & Survival: the ported SOS content, its search, and the live checks.
   UI tests open the Safety tab straight from the hash and scope queries to it. */

const sa = () => within(document.querySelector<HTMLElement>(".safety")!);
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const POINT = { lat: 39.7, lon: -105.2, label: "Test trailhead" };

describe("ported SOS content", () => {
  it("every triage answer leads to a node that exists, and every result has steps", () => {
    const missing: string[] = [];
    Object.entries(TRIAGE).forEach(([fid, flow]) => Object.entries(flow).forEach(([nid, n]: [string, TriageNode]) => {
      if (n.type === "q") n.options.forEach((o) => { if (!TRIAGE[o.flow ?? fid]?.[o.next]) missing.push(`${fid}:${nid} -> ${o.flow ?? fid}:${o.next}`); });
      if (n.type === "menu") n.items.forEach((i) => { if (!triageNode(i.go)) missing.push(`${fid}:${nid} -> ${i.go}`); });
      if (n.type === "result") expect(n.steps.length, `${fid}:${nid}`).toBeGreaterThan(0);
    }));
    expect(missing).toEqual([]);
    expect(SITUATIONS.length).toBe(23);
  });

  it("keeps SOS's wording, warnings and contraindications (spot checks against the source)", () => {
    const sos = readFileSync(join(process.cwd(), "tests/unit/fixtures/sos-excerpts.txt"), "utf8").trim().split("\n");
    const all = JSON.stringify({ TRIAGE, ARTICLES, QUICK_REF });
    sos.forEach((line) => expect(all, line).toContain(line));
  });

  it("carries the outdoor topics and leaves the extended library in SOS", () => {
    expect(ARTICLES.map((a) => a.id)).toEqual(["weather", "nav", "signal", "water", "shelter", "fire", "wildlife", "vehicle", "hazards"]);
    const all = JSON.stringify(ARTICLES).toLowerCase();
    for (const gone of ["tsunami", "pandemic", "civil unrest", "metalworking"]) expect(all).not.toContain(gone);
  });
});

describe("safety search (on the device)", () => {
  it("finds the situation people type, triage first", () => {
    expect(searchSafety("bleeding")[0]).toMatchObject({ kind: "situation", route: { flow: "bleeding" } });
    expect(searchSafety("rattlesnake")[0].route).toEqual({ flow: "snakebite" });
    expect(searchSafety("can't breathe")[0].route.flow).toMatch(/breathing/);
  });
  it("lands on the right article and section", () => {
    expect(searchSafety("flash floods").some((h) => h.route.topic === "weather")).toBe(true);
    expect(searchSafety("north star")[0].route.topic).toBe("nav");
    expect(searchSafety("bleach")[0].route.topic).toMatch(/water|quick/);
  });
  it("searches body text too, and returns nothing for nothing", () => {
    expect(searchSafety("widow makers")[0].route.topic).toBe("shelter");
    expect(searchSafety("")).toEqual([]);
    expect(searchSafety("zzzz qqqq")).toEqual([]);
  });
});

describe("saved topics and context links", () => {
  it("saves and unsaves on this device, ignoring junk", () => {
    toggleSavedRef("flow:bleeding");
    toggleSavedRef("topic:weather");
    expect(loadSaved()).toEqual(["flow:bleeding", "topic:weather"]);
    toggleSavedRef("flow:bleeding");
    expect(loadSaved()).toEqual(["topic:weather"]);
    window.localStorage.setItem(SAFETY_SAVED_KEY, JSON.stringify(["topic:weather", 4, "<script>"]));
    expect(loadSaved()).toEqual(["topic:weather"]);
  });
  it("adds cold or heat by season and vehicle trouble only for rough roads", () => {
    expect(contextLinks({ month: 1 }).map((l) => l.route.flow)).toContain("hypothermia");
    expect(contextLinks({ month: 7 }).map((l) => l.route.flow)).toContain("heat");
    expect(contextLinks({ month: 7, vehicleNote: "2WD Paved lot" }).some((l) => l.route.topic === "vehicle")).toBe(false);
    expect(contextLinks({ month: 7, vehicleNote: "4WD required" }).some((l) => l.route.topic === "vehicle")).toBe(true);
  });
});

describe("live hazards", () => {
  it("parses NWS alerts, most severe first", () => {
    const a = parseAlerts({ features: [
      { properties: { id: "1", event: "Wind Advisory", severity: "Moderate", areaDesc: "A" } },
      { properties: { id: "2", event: "Red Flag Warning", severity: "Severe", areaDesc: "B", senderName: "NWS Boulder CO" } },
    ] });
    expect(a.map((x) => x.event)).toEqual(["Red Flag Warning", "Wind Advisory"]);
    expect(() => parseAlerts({ nope: true })).toThrow();
  });
  it("keeps quakes within 300 km and facilities sorted by distance", () => {
    const q = parseQuakes({ features: [
      { geometry: { coordinates: [-105.3, 39.8, 5] }, properties: { mag: 2.7, place: "near", time: 2, url: "u1" } },
      { geometry: { coordinates: [-120, 36, 5] }, properties: { mag: 4.1, place: "far", time: 3, url: "u2" } },
    ] }, POINT);
    expect(q.map((x) => x.place)).toEqual(["near"]);
    const f = parseFacilities({ elements: [
      { lat: 39.9, lon: -105.2, tags: { amenity: "hospital", name: "Far" } },
      { center: { lat: 39.71, lon: -105.2 }, tags: { amenity: "ranger_station", name: "Near" } },
      { lat: 39.7, lon: -105.2, tags: { amenity: "cafe", name: "Not help" } },
    ] }, POINT);
    expect(f.map((x) => x.name)).toEqual(["Near", "Far"]);
  });
  it("an empty answer is ok, a failed request is a failure, never an empty list", async () => {
    const empty = await checkHazard("alerts", POINT, vi.fn(() => json({ features: [] })) as unknown as typeof fetch);
    expect(empty).toMatchObject({ ok: true, data: [] });
    const err = await checkHazard("alerts", POINT, vi.fn(() => json({}, 503)) as unknown as typeof fetch);
    expect(err).toMatchObject({ ok: false, reason: "failed" });
    const thrown = await checkHazard("air", POINT, vi.fn(() => Promise.reject(new TypeError("network"))) as unknown as typeof fetch);
    expect(thrown).toMatchObject({ ok: false, reason: "failed" });
    const outside = await checkHazard("alerts", POINT, vi.fn(() => json({}, 404)) as unknown as typeof fetch);
    expect(outside).toMatchObject({ ok: false, reason: "outside" });
    const garbage = await checkHazard("alerts", POINT, vi.fn(() => json({ hello: 1 })) as unknown as typeof fetch);
    expect(garbage.ok).toBe(false);
  });
  it("says offline without trying the network", async () => {
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const f = vi.fn();
    expect(await checkHazard("alerts", POINT, f as unknown as typeof fetch)).toMatchObject({ ok: false, reason: "offline" });
    expect(f).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("marks answers stale by kind and tells their age", () => {
    const now = Date.now();
    expect(isStale({ kind: "alerts", at: now - STALE_MS.alerts - 1 }, now)).toBe(true);
    expect(isStale({ kind: "facilities", at: now - STALE_MS.alerts - 1 }, now)).toBe(false);
    expect(ageText(now - 30_000, now)).toBe("just now");
    expect(ageText(now - 12 * 60_000, now)).toBe("12 min ago");
    expect(ageText(now - 26 * 3600_000, now)).toBe("1 day ago");
  });
});

describe("Safety & Survival in the app", () => {
  const geo = () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    return getCurrentPosition;
  };

  it("opens from the tab bar with the call button and triage up front, without asking for location", async () => {
    const getPos = geo();
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(screen.getByRole("navigation", { name: "Sections" })).getByRole("button", { name: "Safety" }));
    expect(window.location.hash).toBe("#safety");
    expect(sa().getByRole("heading", { name: /safety & survival/i })).toBeTruthy();
    expect(sa().getByRole("link", { name: "Call 911" }).getAttribute("href")).toBe("tel:911");
    expect(sa().getByText(/can't call for help, diagnose an injury or promise anyone's safety/i)).toBeTruthy();
    await user.click(sa().getByRole("button", { name: /live conditions/i }));
    expect(sa().getByRole("button", { name: /use my location/i })).toBeTruthy();
    expect(getPos).not.toHaveBeenCalled();
  });

  it("walks a triage flow to a severe result with the call button, what not to do, and the medical note", async () => {
    window.location.hash = "#safety";
    const user = userEvent.setup();
    render(<App />);
    await user.click(sa().getByRole("button", { name: "Severe bleeding" }));
    expect(sa().getByRole("heading", { name: /spurting, pumping, or pooling/i })).toBeTruthy();
    await user.click(sa().getByRole("button", { name: /yes, severe\/rapid/i }));
    expect(window.location.hash).toBe("#safety&flow=bleeding:severe");
    expect(sa().getByRole("heading", { name: /severe bleeding: act fast/i })).toBeTruthy();
    expect(sa().getByRole("link", { name: /call 911 now/i })).toBeTruthy();
    expect(sa().getByText(/don't loosen or remove a tourniquet/i)).toBeTruthy();
    expect(sa().getByText(/hasn't yet been reviewed by a medical professional/i)).toBeTruthy();
    await user.click(sa().getByRole("button", { name: /start this flow over/i }));
    expect(sa().getByRole("heading", { name: /spurting/i })).toBeTruthy();
  });

  it("a mild result has no call button", async () => {
    window.location.hash = "#safety&flow=hypothermia:mild";
    render(<App />);
    expect(sa().getByRole("heading", { name: "Mild hypothermia" })).toBeTruthy();
    expect(sa().queryByRole("link", { name: /call 911/i })).toBeNull();
  });

  it("searches the bundled guide and opens what it finds, with no network at all", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
    window.location.hash = "#safety";
    const user = userEvent.setup();
    render(<App />);
    await user.type(sa().getByRole("searchbox", { name: /search safety/i }), "lightning");
    await user.click(within(sa().getByLabelText("Search results")).getAllByRole("button")[0]);
    expect(window.location.hash).toMatch(/topic=(weather|quick)/);
    expect(sa().getAllByText(/30 seconds|30 sec/i).length).toBeGreaterThan(0);
  });

  it("saved topics show up on the Safety page", async () => {
    window.location.hash = "#safety&topic=water";
    const user = userEvent.setup();
    render(<App />);
    await user.click(sa().getByRole("button", { name: "Save" }));
    await user.click(sa().getByRole("button", { name: /safety/i }));
    expect(within(sa().getByLabelText("Saved")).getByRole("button", { name: "Water & Food" })).toBeTruthy();
  });

  it("no alerts is not called safe, and a failure is not called clear", async () => {
    let fail = false;
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (fail) return json({}, 500);
      if (String(url).includes("weather.gov")) return json({ features: [] });
      if (String(url).includes("air-quality")) return json({ current: { us_aqi: 41, pm2_5: 5, pm10: 8 } });
      return new Promise(() => {});
    }));
    window.location.hash = "#trail=greenmtn";
    const user = userEvent.setup();
    render(<App />);
    const ready = within(await screen.findByRole("region", { name: "Be ready" }));
    await user.click(ready.getByRole("button", { name: "Check now" }));
    expect(await ready.findByText(/that doesn't mean the area is safe/i)).toBeTruthy();
    expect(ready.getByText(/national weather service/i)).toBeTruthy();
    expect(ready.getByText(/US AQI 41/)).toBeTruthy();
    fail = true;
    await user.click(ready.getByRole("button", { name: "Check again" }));
    expect((await ready.findAllByText(/latest check failed/i)).length).toBe(2);
  });

  it("a first failure says it isn't an all-clear; denied location checks nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({}, 500)));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) => err({ code: 1 }) } });
    window.localStorage.setItem("co-trail-start-v1", JSON.stringify({ key: "place", label: "Denver, Colorado", lat: 39.74, lon: -104.99 }));
    window.location.hash = "#safety&topic=live";
    const user = userEvent.setup();
    render(<App />);
    const before = vi.mocked(fetch).mock.calls.length;
    await user.click(sa().getByRole("button", { name: /use my location/i }));
    expect(await sa().findByRole("alert")).toHaveProperty("textContent", expect.stringMatching(/location is off for this site, so nothing was checked/i));
    expect(vi.mocked(fetch).mock.calls.length).toBe(before);
    await user.click(sa().getByRole("button", { name: /check denver, colorado/i }));
    expect((await sa().findAllByText(/this is not an all-clear/i)).length).toBe(4);
  });

  it("an old saved answer is shown with its age and marked stale", async () => {
    const at = Date.now() - 3 * 3600_000;
    window.localStorage.setItem("co-field-hazards-v1", JSON.stringify({ alerts: { ok: true, kind: "alerts", at, point: { lat: 39.694, lon: -105.147, label: "Green Mountain Loop trailhead" }, data: [] } }));
    window.location.hash = "#trail=greenmtn";
    render(<App />);
    const ready = within(await screen.findByRole("region", { name: "Be ready" }));
    expect(ready.getByText(/3 hr ago/)).toBeTruthy();
    expect(ready.getByText(/stale: check again/i)).toBeTruthy();
  });

  it("trail pages link to general reading, labelled as general", async () => {
    window.location.hash = "#trail=greenmtn";
    const user = userEvent.setup();
    render(<App />);
    const ready = within(await screen.findByRole("region", { name: "Be ready" }));
    expect(ready.getByText("General reference")).toBeTruthy();
    await user.click(ready.getByRole("button", { name: /lost or stranded/i }));
    await waitFor(() => expect(window.location.hash).toBe("#safety&flow=lost"));
    expect(sa().getByRole("heading", { name: /S\.T\.O\.P\./ })).toBeTruthy();
  });

  it("the print view holds every flow, every topic and the contacts", () => {
    window.location.hash = "#safety&topic=print";
    render(<App />);
    const text = document.querySelector(".safety")!.textContent!;
    SITUATIONS.forEach((s) => expect(text).toContain(s.label));
    ARTICLES.forEach((a) => expect(text).toContain(a.title));
    expect(text).toContain("Poison Control (US)");
    expect(sa().getByRole("button", { name: /print or save as pdf/i })).toBeTruthy();
  });
});
