import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { ATLAS_KEY, getAtlas, reloadAtlas } from "../../src/lib/atlas";
import { LOG_KEY } from "../../src/lib/storage";
import { SPECIES } from "../../src/data/species";
import { COLORADO_LOCATIONS } from "../../src/data/foliage";

/* These tests drive the whole app through 10-30 real interactions each in
   jsdom. On a busy 2-4 CPU machine a full journey can need more than the
   5 s default even with the scoped queries below. */
vi.setConfig({ testTimeout: 15_000 });

/* The merged product's main loops, through the real UI: find a place,
   identify something, save it, see it in the atlas and in a quest. */
beforeEach(() => reloadAtlas());

const tab = (name: RegExp) => document.querySelector('nav[aria-label="Sections"]')!.querySelector(`button:nth-child(${["explore", "identify", "atlas", "quests"].findIndex((t) => name.test(t)) + 1})`) as HTMLButtonElement;

/* Explore stays mounted (hidden) behind the other tabs, so the document holds
   ~1,200 nodes of map and trail list. A document-wide *ByRole query computes
   the role of every one of them, which costs 300-500 ms per query in jsdom;
   a dozen of those per flow is what pushed these tests past 5 s on a busy
   machine. Queries for the active tab are scoped to that tab's screen. */
const onScreen = (name: "identify" | "atlas") => within(document.querySelector<HTMLElement>(`.screen.${name}`)!);

async function keyOutAspen(user: ReturnType<typeof userEvent.setup>) {
  await user.click(onScreen("identify").getByRole("button", { name: /^plant/i }));
  await user.click(onScreen("identify").getByRole("button", { name: /no photo, just the questions/i }));
  await user.click(onScreen("identify").getByRole("button", { name: /leaves on a tree or shrub/i }));
  for (const l of [/^one at a time/i, /^one blade/i, /^nearly round/i, /^toothed/i, /^tree, one main trunk/i, /^smooth white bark/i]) {
    await user.click(onScreen("identify").getByRole("button", { name: l }));
  }
  await user.click(onScreen("identify").getByRole("button", { name: "See matches" }));
}

describe("navigation", () => {
  it("has the four destinations and no separate field-guide tab", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(["Explore", "Nature ID", "Journal", "Quests"]);
  });

  it("tabs are in the URL, so back and shared links work", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(tab(/quests/));
    expect(window.location.hash).toBe("#quests");
    expect(screen.getByRole("heading", { name: "Quests" })).toBeTruthy();
  });

  it("a guide entry opens from Explore search without leaving the map", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole("searchbox", { name: /search the atlas classics/i }), "aspen");
    await user.click(within(screen.getByLabelText("In the field guide")).getByRole("button", { name: /quaking aspen/i }));
    const d = screen.getByRole("dialog");
    expect(within(d).getByRole("heading", { name: "Quaking aspen" })).toBeTruthy();
    expect(window.location.hash).toBe("#species=quaking-aspen");
  });
});

describe("identify, save, collect", () => {
  it("keys out a plant, qualifies the result, saves it to a place and shows it in the atlas", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(tab(/identify/));
    await keyOutAspen(user);
    expect(screen.getByText(/not on the photo/i)).toBeTruthy();
    const first = onScreen("identify").getAllByRole("listitem").find((li) => li.classList.contains("match"))!;
    expect(within(first).getByText("Quaking aspen")).toBeTruthy();
    expect(within(first).getByText(/strong match/i)).toBeTruthy();
    await user.click(within(first).getByRole("button", { name: "It's this one" }));
    await user.selectOptions(screen.getByLabelText("Where"), "trail:greenmtn");
    await user.type(screen.getByLabelText("Field note"), "white bark by the creek");
    await user.click(onScreen("identify").getByRole("button", { name: "Save to my atlas" }));

    const d = await screen.findByRole("dialog");
    expect(within(d).getByRole("heading", { name: "Quaking aspen" })).toBeTruthy();
    expect(within(d).getByRole("button", { name: "Green Mountain Loop" })).toBeTruthy();
    const obs = getAtlas().observations[0];
    expect(obs).toMatchObject({ speciesId: "quaking-aspen", placeRef: "trail:greenmtn", idMethod: "key", keyStrength: "strong", note: "white bark by the creek", coords: null });
    expect(JSON.parse(window.localStorage.getItem(ATLAS_KEY)!).observations).toHaveLength(1);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onScreen("atlas").getByRole("heading", { name: "Field Journal" })).toBeTruthy();
    expect(onScreen("atlas").getByRole("progressbar", { name: /species found/i }).getAttribute("aria-valuenow")).toBe("1");
    expect(onScreen("atlas").getByRole("button", { name: /quaking aspen, found 1 time/i })).toBeTruthy();
  });

  it("the same species twice is two finds on one card", async () => {
    const user = userEvent.setup();
    render(<App />);
    for (let i = 0; i < 2; i++) {
      await user.click(tab(/identify/));
      await keyOutAspen(user);
      await user.click(onScreen("identify").getAllByRole("button", { name: "It's this one" })[0]);
      await user.click(onScreen("identify").getByRole("button", { name: "Save to my atlas" }));
      await user.keyboard("{Escape}");
    }
    await waitFor(() => expect(onScreen("atlas").getByRole("button", { name: /quaking aspen, found 2 times/i })).toBeTruthy());
    expect(onScreen("atlas").getByRole("progressbar", { name: /species found/i }).getAttribute("aria-valuenow")).toBe("1");
  });

  it("an unsure find is saved with its suggestions and can be named later", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(tab(/identify/));
    await keyOutAspen(user);
    await user.click(onScreen("identify").getByRole("button", { name: /not sure: save unidentified/i }));
    await user.click(onScreen("identify").getByRole("button", { name: "Save to my atlas" }));
    const d = await screen.findByRole("dialog");
    expect(within(d).getByRole("heading", { name: /not identified yet/i })).toBeTruthy();
    expect(getAtlas().observations[0].candidates[0]).toBe("quaking-aspen");
    await user.click(within(d).getAllByRole("button", { name: "It's this one" })[0]);
    expect(getAtlas().observations[0].speciesId).toBe("quaking-aspen");
  });
});

describe("outings tie trails, finds and the hiking log together", () => {
  it("finds made on an outing join it, and ending it offers to log the trail as hiked", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/#trail=greenmtn");
    render(<App />);
    const d = screen.getByRole("dialog");
    await user.click(within(d).getByRole("button", { name: /start outing/i }));
    await user.click(within(d).getByRole("button", { name: "Log a find here" }));
    expect(screen.getByText(/saving to your outing at/i).textContent).toMatch(/green mountain loop/i);
    await keyOutAspen(user);
    await user.click(onScreen("identify").getAllByRole("button", { name: "It's this one" })[0]);
    expect((screen.getByLabelText("Where") as HTMLSelectElement).value).toBe("trail:greenmtn");
    await user.click(onScreen("identify").getByRole("button", { name: "Save to my atlas" }));
    const out = getAtlas().outings[0];
    expect(getAtlas().observations[0].outingId).toBe(out.id);

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /^end$/i }));
    const prompt = screen.getByRole("dialog", { name: /mark trail as hiked/i });
    await user.click(within(prompt).getByRole("button", { name: "Mark hiked" }));
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!).greenmtn.done).toBe(true);
    expect(getAtlas().outings[0].endedAt).not.toBeNull();
  });
});

describe("existing CO Trail Atlas data", () => {
  it("is read in place: hiked trails, ratings and notes show up untouched", async () => {
    const log = { greenmtn: { done: true, rating: 5, notes: "first snow" }, ntable: { done: true } };
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log));
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText("/47 hiked", { exact: false }).textContent).toMatch(/2/);
    await user.click(tab(/atlas/));
    expect(screen.getByText("Trails hiked").nextSibling!.textContent).toMatch(/^2/);
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!)).toEqual(log);
  });
});

describe("fall color and dark skies in Explore", () => {
  it("lists Leaf Hunter's spots with labelled estimates, and a leaf check overrides the estimate", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: /fall color/i }));
    const list = screen.getByRole("region", { name: "Fall color spots" });
    expect(list.querySelectorAll("li.row").length).toBe(COLORADO_LOCATIONS.length);
    await user.click(within(list).getAllByRole("button", { name: /kenosha pass/i })[0]);
    const d = screen.getByRole("dialog");
    expect(within(d).getByText(/not an observation/i)).toBeTruthy();
    await user.click(within(d).getByRole("button", { name: "Log a leaf check" }));
    await user.click(within(d).getByRole("button", { name: "Save leaf check" }));
    expect(within(d).getByText(/from your leaf check/i)).toBeTruthy();
    expect(getAtlas().observations[0]).toMatchObject({ kind: "leafcheck", placeRef: "color:kenosha-pass" });
  });

  it("dark-sky sites carry LOOKUP's sources and tonight's computed sky", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: /dark skies/i }));
    await user.click(screen.getAllByRole("button", { name: /great sand dunes/i })[0]);
    const d = screen.getByRole("dialog");
    expect(within(d).getByRole("region", { name: "Tonight's sky" })).toBeTruthy();
    expect(within(d).getByText(/DarkSky International/)).toBeTruthy();
    expect(within(d).getByText(/estimate, not measured/i)).toBeTruthy();
  });
});

describe("network trouble never invents data", () => {
  it("a species page without iNaturalist still shows the guide and says what's missing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
    window.history.replaceState(null, "", "/#species=blue-columbine");
    render(<App />);
    const d = screen.getByRole("dialog");
    expect(within(d).getByRole("heading", { name: "Colorado blue columbine" })).toBeTruthy();
    expect(within(d).getByText(/state flower/i)).toBeTruthy();
    await waitFor(() => expect(within(d).getByText(/couldn't load colorado records/i)).toBeTruthy());
    expect(within(d).getByText(/photo loads from inaturalist when you're online/i)).toBeTruthy();
  });

  it("the guide index lists every species", async () => {
    window.history.replaceState(null, "", "/#guide=all");
    render(<App />);
    expect(screen.getByRole("dialog").querySelectorAll(".guide-list li").length).toBe(SPECIES.length);
  });
});
