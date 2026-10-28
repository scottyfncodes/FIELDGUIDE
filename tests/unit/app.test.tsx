import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { TRAILS } from "../../src/data/trails";
import { LOG_KEY, START_KEY, WX_KEY } from "../../src/lib/storage";
import { todayKey } from "../../src/lib/weather";

const rows = () => screen.getByRole("region", { name: "Trails" }).querySelectorAll("li.row");
const openTrail = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  await user.click(screen.getAllByRole("button", { name }).find((b) => b.classList.contains("row-main"))!);
  return screen.getByRole("dialog");
};

describe("app boot", () => {
  it("renders the atlas with every trail, the map and the discovery controls", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: /co field atlas/i })).toBeTruthy();
    expect(rows().length).toBe(TRAILS.length);
    expect(screen.getByRole("application", { name: /map of colorado/i })).toBeTruthy();
    expect(document.querySelectorAll("g.mark").length).toBe(TRAILS.length);
    expect(screen.getByRole("searchbox", { name: /search trails/i })).toBeTruthy();
    expect(screen.getByText(`/${TRAILS.length} hiked`, { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: /loading forecast/i })).toBeTruthy();
  });

  it("groups by area, nearest first from the saved starting point", () => {
    window.localStorage.setItem(START_KEY, JSON.stringify({ key: "durango", label: "Durango", lat: 37.2753, lon: -107.8801 }));
    render(<App />);
    const first = screen.getAllByRole("heading", { level: 2 })[0];
    expect(first.textContent).toMatch(/durango/i);
  });

  it("ignores corrupt saved data instead of crashing", () => {
    window.localStorage.setItem(LOG_KEY, "{oops");
    window.localStorage.setItem(START_KEY, JSON.stringify({ lat: "x" }));
    render(<App />);
    expect(rows().length).toBe(TRAILS.length);
    expect(screen.getByText(/nearest to Sloan's Lake/)).toBeTruthy();
  });
});

describe("discovery", () => {
  it("search narrows the list and the map, and shows a recoverable empty state", async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = screen.getByRole("searchbox");
    await user.type(box, "falls");
    const names = [...rows()].map((r) => r.querySelector(".row-name")!.textContent);
    expect(names.length).toBeGreaterThan(2);
    names.forEach((n) => expect(n).toMatch(/falls/i));
    expect(document.querySelectorAll("g.mark").length).toBe(names.length);

    await user.clear(box);
    await user.type(box, "zzzz");
    expect(rows().length).toBe(0);
    expect(screen.getByText(/no trails match/i)).toBeTruthy();
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
    expect(screen.queryAllByRole("heading", { level: 2 }).length).toBe(0);
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

describe("starting point", () => {
  it("changing it re-sorts and persists; geolocation errors are explained", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Starting point" }), "durango");
    expect(screen.getAllByRole("heading", { level: 2 })[0].textContent).toMatch(/durango/i);
    expect(JSON.parse(window.localStorage.getItem(START_KEY)!).key).toBe("durango");

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, err: () => void) => err() },
    });
    await user.selectOptions(screen.getByRole("combobox", { name: "Starting point" }), "gps");
    expect(screen.getByText(/couldn't read your location/i)).toBeTruthy();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 39.64, longitude: -106.37 } }) },
    });
    await user.selectOptions(screen.getByRole("combobox", { name: "Starting point" }), "gps");
    expect(screen.getAllByRole("heading", { level: 2 })[0].textContent).toMatch(/vail/i);
  });
});
