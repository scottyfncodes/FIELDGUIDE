import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import { PNG_1PX, stubNetwork } from "./stubs";

/* Location-first discovery and wildlife ID, end to end on phones. Every
   network source answers from fixtures (tests/fixtures/sources.ts). Set
   SHOTS=<dir> to keep a screenshot of each key screen. */
let errors: string[] = [];
test.beforeEach(async ({ page }) => { errors = []; await stubNetwork(page, errors); });
test.afterEach(async () => { expect(errors, "console / page errors").toEqual([]); });

const noOverflow = async (page: Page) => {
  const [sw, vw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(vw);
};
const shot = async (page: Page, info: TestInfo, name: string, full = false) => {
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${info.project.name}-${name}.png`, fullPage: full });
};
/* the phone refuses location, the way Safari does after "Don't Allow" */
const refuseLocation = (page: Page) => page.addInitScript(() => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_ok: unknown, err: (e: { code: number }) => void) => setTimeout(() => err({ code: 1 }), 50) } });
});

test("location refused → type a place → pick → nearby trails, merged → details → save → journal", async ({ page }, info) => {
  await refuseLocation(page);
  await page.goto("/");
  await shot(page, info, "01-start");
  await page.getByRole("button", { name: /use my location/i }).click();
  await expect(page.getByRole("alert")).toContainText(/location is turned off/i);
  await expect(page.getByLabel(/address or place/i)).toBeFocused();

  await page.getByLabel(/address or place/i).fill("Boulder");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /^Boulder Boulder County/ }).click();

  const list = page.getByRole("region", { name: "Trails near you" });
  await expect(list.locator(".rows-flat > li")).toHaveCount(20);
  await expect(list.locator(".row-name", { hasText: /^Mesa Trail$/ })).toHaveCount(1);
  await expect(list.getByText(/straight lines from Boulder/)).toBeVisible();
  await expect(page.locator(".dm .dm-trail").first()).toBeVisible();
  await expect(list.getByRole("button", { name: /show \d+ more/i })).toBeVisible();
  await expect(list.locator("footer")).toContainText("COTREX: 26 segments");
  await noOverflow(page);
  await shot(page, info, "02-results");

  await list.getByRole("button", { name: /^Mesa Trail/ }).click();
  const d = page.getByRole("dialog");
  await expect(d.getByRole("heading", { name: "Mesa Trail" })).toBeVisible();
  await expect(d.locator(".route-plate")).toBeVisible();
  await expect(d.getByText("Trail class 3 of 5: developed")).toBeVisible();
  await expect(d.getByText(/up, one way along/)).toBeVisible();
  await expect(d.getByRole("link", { name: /directions to south mesa trailhead/i })).toHaveAttribute("href", /destination=39\.9901,-105\.2821/);
  await expect(d.locator(".src-list")).toContainText("Colorado Trail Explorer");
  await expect(d.locator(".src-list")).toContainText("OpenStreetMap");
  await noOverflow(page);
  await shot(page, info, "03-found-trail");
  await d.getByRole("button", { name: "Save trail" }).click();
  await page.keyboard.press("Escape");

  await page.reload(); // the search point and the saved trail both survive
  await expect(page.locator(".lp-from b")).toHaveText(/Boulder/);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Journal" }).click();
  await page.getByRole("tab", { name: "Places" }).click();
  await expect(page.getByRole("button", { name: /Mesa Trail/ })).toBeVisible();
  await page.getByRole("button", { name: /Mesa Trail/ }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Mesa Trail" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Saved", exact: true }).last()).toHaveAttribute("aria-pressed", "true");
});

test("location allowed → trails around the fix; the radius re-queries", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.0, longitude: -105.28, accuracy: 20 });
  const asked: string[] = [];
  page.on("request", (r) => { if (r.url().includes("MapServer/40/query") && r.url().includes("returnCountOnly")) asked.push(r.url()); });
  await page.goto("/");
  await page.getByRole("button", { name: /use my location/i }).click();
  await expect(page.locator(".lp-from b")).toHaveText(/Near Boulder, Colorado|Your location/);
  const list = page.getByRole("region", { name: "Trails near you" });
  await expect(list.locator(".rows-flat > li").first()).toBeVisible();
  const before = asked.length;
  await page.getByRole("radio", { name: "25 mi" }).click();
  await expect(page.getByRole("radio", { name: "25 mi" })).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => asked.length).toBeGreaterThan(before);
  await expect(list.getByText(/within 25 mi/)).toBeVisible();
});

test("wildlife without photo recognition: compare with birds seen nearby → save with rough location → journal", async ({ page, context }, info) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.0, longitude: -105.28, accuracy: 20 });
  await page.goto("/#identify");
  await shot(page, info, "04-nature-id");
  await page.getByRole("button", { name: /^bird/i }).click();
  await page.locator(".capture input").setInputFiles({ name: "bird.png", mimeType: "image/png", buffer: PNG_1PX });
  await expect(page.getByText(/isn't switched on for this site/i)).toBeVisible();
  await page.getByRole("button", { name: /compare with species seen nearby/i }).click();
  await page.getByRole("button", { name: "Use my location" }).click();
  const tile = page.getByRole("button", { name: /Mountain Bluebird/ }).first();
  await expect(tile).toBeVisible();
  await expect(page.getByText(/research-grade iNaturalist sightings within 10 km/i)).toBeVisible();
  await tile.click();
  await expect(page.locator(".side-by-side figcaption").nth(1)).toContainText("Test Observer");
  await noOverflow(page);
  await shot(page, info, "05-compare");
  await page.locator(".side-by-side").getByRole("button", { name: "It's this one" }).click();
  await page.getByLabel(/approximate, rounded to about 1 km/i).check();
  await page.getByRole("button", { name: "Save to my journal" }).click();

  const obs = page.getByRole("dialog");
  await expect(obs.getByRole("heading", { name: "Mountain Bluebird" })).toBeVisible();
  await expect(obs.getByText(/rounded to ~1 km/)).toBeVisible();
  await expect(obs.getByText(/compared with sightings nearby/i)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Field Journal" })).toBeVisible();
  await page.getByRole("button", { name: /Mountain Bluebird, seen 1 time/ }).click();
  await expect(page.getByRole("dialog").getByText(/a small thrush/i)).toBeVisible();
  await noOverflow(page);
  await shot(page, info, "06-species");
});

test("wildlife with photo recognition: hedged suggestions, visible marks, nearby context", async ({ page }, info) => {
  await page.route("**/api/identify", (r) => r.request().method() === "GET"
    ? r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: true, model: "claude-opus-5-5" }) })
    : r.fulfill({ contentType: "application/json", body: JSON.stringify({
      photo: { usable: true, issues: ["distant"] },
      candidates: [
        { scientific_name: "Sialia currucoides", common_name: "Mountain Bluebird", likelihood: "likely", visible_features: ["all-blue back and wings"], check_next: "Look for any rusty orange on the breast." },
        { scientific_name: "Sialia mexicana", common_name: "Western Bluebird", likelihood: "possible", visible_features: [], check_next: "Western has a rusty breast." },
      ],
      better_photo_tips: ["Get closer so the bird fills more of the frame."], safety_note: null,
    }) }));
  await page.goto("/#trail=greenmtn");
  await page.getByRole("dialog").getByRole("button", { name: "Log a find here" }).click();
  await page.getByRole("button", { name: /^bird/i }).click();
  await page.locator(".capture input").setInputFiles({ name: "bird.png", mimeType: "image/png", buffer: PNG_1PX });
  await page.getByRole("button", { name: "Suggest from the photo" }).click();
  const first = page.locator("li.match").first();
  await expect(first).toContainText("Mountain Bluebird");
  await expect(first).toContainText("Possible match"); // "likely" capped: the bird was distant
  await expect(first).toContainText("42 research-grade sightings within 10 km");
  await expect(page.getByText("The animal is small or far away in the frame")).toBeVisible();
  await expect(page.getByText(/get closer/i)).toBeVisible();
  await expect(page.locator("li.match").nth(1)).toContainText(/couldn't match this name/i); // not in the stub's taxa: can't be saved by name
  await expect(page.getByText(/certain/i)).toHaveCount(0);
  await noOverflow(page);
  await shot(page, info, "07-photo-suggestions", true);
  await first.getByRole("button", { name: "It's this one" }).click();
  await expect(page.getByLabel("Where", { exact: true })).toHaveValue("trail:greenmtn");
  await page.getByRole("button", { name: "Save to my journal" }).click();
  await expect(page.getByRole("dialog").getByText(/from a photo suggestion \(possible\)/i)).toBeVisible();
});

test("explore screens on a phone, for review", async ({ page }, info) => {
  test.skip(!process.env.SHOTS, "screenshots only");
  await page.goto("/");
  await page.getByLabel(/address or place/i).fill("Boulder");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /^Boulder Boulder County/ }).click();
  await page.getByRole("region", { name: "Trails near you" }).locator(".rows-flat > li").first().waitFor();
  await shot(page, info, "08-explore-full", true);
  await page.goto("/#trail=bierstadt");
  await shot(page, info, "09-classic-trail", true);
});
