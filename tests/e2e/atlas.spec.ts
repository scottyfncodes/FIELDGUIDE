import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { stubNetwork } from "./stubs";

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 900;

async function markerPoints(page: Page) {
  const box = (await page.locator("svg.map").boundingBox())!;
  const ts = await page.$$eval("g.mark", (gs) => gs.map((g) => g.getAttribute("transform")!));
  return ts.map((t) => {
    const [, x, y] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(t)!;
    return { x: box.x + +x, y: box.y + +y };
  });
}

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  await stubNetwork(page, errors);
});

test.afterEach(async () => {
  expect(errors, "console / page errors").toEqual([]);
});

test("boots into the atlas with a forecast and no layout overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^field guide$/i);
  await expect(page.locator("li.row")).toHaveCount(47);
  await expect(page.locator("g.mark-good").first()).toBeVisible();
  await expect(page.locator("g.mark-poor").first()).toBeVisible();
  const [sw, vw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(vw);
  // the location-first start is visible without scrolling, and the classics map is there below it
  const locate = (await page.getByRole("button", { name: /use my location/i }).boundingBox())!;
  expect(locate.y + locate.height).toBeLessThan(page.viewportSize()!.height * 0.75);
  const map = (await page.locator("svg.map").boundingBox())!;
  expect(map.height).toBeGreaterThan(280);
});

test("touch targets are finger-sized", async ({ page }) => {
  test.skip(!isMobile(page), "phone layouts only");
  await page.goto("/");
  const sel = [".lp-locate", ".zbtn", ".region-chip", ".fchip", ".row-check", ".row-main", ".search", ".wx-btn"];
  for (const s of sel) {
    const boxes = await page.locator(s).evaluateAll((els) => els.slice(0, 6).map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]));
    expect(boxes.length, s).toBeGreaterThan(0);
    for (const [w, h] of boxes) {
      expect(Math.min(w, h), `${s} ${w}x${h}`).toBeGreaterThanOrEqual(s === ".wx-btn" ? 36 : 44);
    }
  }
});

test("tap a trail on the map → preview → details → back", async ({ page }) => {
  await page.goto("/");
  await page.locator("svg.map").evaluate((e) => e.scrollIntoView({ block: "center" })); // the classics map sits below the location panel
  // a tap on a lone marker selects it; a tap on a cluster zooms in — keep tapping until a preview shows
  for (let i = 0; i < 5 && !(await page.locator(".preview").count()); i++) {
    const vh = page.viewportSize()!.height;
    const pts = (await markerPoints(page)).filter((m) => m.y > 80 && m.y < vh - 120); // clear of the app bar and tab bar
    const p = pts[pts.length - 1];
    if (isMobile(page)) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(450);
  }
  const preview = page.locator(".preview");
  await expect(preview).toBeVisible();
  const name = (await preview.locator(".preview-name").textContent())!;
  await preview.getByRole("button", { name: /open details/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(name);
  await expect(dialog.getByRole("link", { name: /directions/i })).toHaveAttribute("href", /google\.com\/maps\/dir/);
  expect(page.url()).toMatch(/#trail=/);
  await page.goBack(); // iOS swipe-back / Android back
  await expect(dialog).toBeHidden();
  expect(page.url()).not.toMatch(/#trail=/);
});

test("map pans with a drag, zooms with the buttons and resets", async ({ page }) => {
  await page.goto("/");
  await page.locator("svg.map").scrollIntoViewIfNeeded();
  const firstMark = async () => (await markerPoints(page))[0];
  const before = await firstMark();
  const box = (await page.locator("svg.map").boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(700); // let any fling settle
  const panned = await firstMark();
  expect(Math.abs(panned.x - before.x)).toBeGreaterThan(20);

  const zoom = async () => Number(await page.locator("svg.map").getAttribute("data-zoom"));
  const z0 = await zoom();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(400);
  expect(await zoom()).toBeCloseTo(z0 * 1.6, 1);
  await page.getByRole("button", { name: /zoom map out/i }).click();
  await page.waitForTimeout(500);
  const home = await firstMark();
  expect(Math.abs(home.x - before.x)).toBeLessThan(2);
});

test("region chip flies the map in and narrows the list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: /region/i }).getByRole("button", { name: /san juans/i }).click();
  await expect(page.locator("li.row")).toHaveCount(12);
  await page.waitForTimeout(500);
  await expect(page.locator("text.mark-lbl").first()).toBeVisible(); // zoomed in far enough for names
});

test("search + filters work with the on-screen controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: /search the atlas classics/i }).fill("lake");
  const n = await page.locator("li.row").count();
  expect(n).toBeGreaterThan(3);
  await page.getByRole("combobox", { name: "Difficulty" }).selectOption("Hard");
  const m = await page.locator("li.row").count();
  expect(m).toBeLessThan(n);
  await page.getByRole("button", { name: /clear 2 filters/i }).click();
  await expect(page.locator("li.row")).toHaveCount(47);
});

test("the log survives a reload", async ({ page }) => {
  await page.goto("/#trail=gog");
  await page.getByRole("dialog").getByRole("button", { name: /mark as hiked/i }).click();
  await page.reload();
  await expect(page.getByRole("dialog").getByRole("button", { name: /hiked it/i })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".tally b")).toHaveText("1");
});

test.describe("installed app", () => {
test.use({ serviceWorkers: "allow" });
test("PWA: manifest, icons and offline shell", async ({ page, context, request }) => {
  const manifest = await (await request.get("/manifest.json")).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
  expect((await request.get("/icon-180.png")).status()).toBe(200);

  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the worker, assets cached
  await expect(page.locator("li.row")).toHaveCount(47);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("li.row")).toHaveCount(47);
  await context.setOffline(false);
  // requests failing while offline are expected; uncaught exceptions are not
  const real = errors.filter((e) => !/Failed to load resource/.test(e));
  errors.splice(0, errors.length, ...real);
});
});
