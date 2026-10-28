import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PNG_1PX, stubNetwork } from "./stubs";

/* The merged product's central loop on real phones (emulated): find a trail,
   start an outing, photograph something, key it out, save it, and see it in
   the atlas and a quest, with the photo kept across a reload. */
let errors: string[] = [];
test.beforeEach(async ({ page }) => { errors = []; await stubNetwork(page, errors); });
test.afterEach(async () => { expect(errors, "console / page errors").toEqual([]); });

const noOverflow = async (page: Page) => {
  const [sw, vw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(vw);
};

test("trail → outing → photo → key → save → atlas → quest", async ({ page }) => {
  await page.goto("/#trail=greenmtn");
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("region", { name: "Recorded nearby" }).getByText("common starlily")).toBeVisible();
  await sheet.getByRole("button", { name: /start outing/i }).click();
  await sheet.getByRole("button", { name: "Log a find here" }).click();

  await expect(page.getByText(/saving to your outing at/i)).toContainText("Green Mountain Loop");
  await page.locator(".capture input").setInputFiles({ name: "leaf.png", mimeType: "image/png", buffer: PNG_1PX });
  await expect(page.locator("img.id-shot")).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: /leaves on a tree or shrub/i }).click();
  for (const l of [/^One at a time/, /^One blade/, /^Nearly round/, /^Toothed/, /^Tree, one main trunk/, /^Smooth white bark/]) {
    await page.getByRole("button", { name: l }).click();
  }
  await page.getByRole("button", { name: "See matches" }).click();
  const first = page.locator("li.match").first();
  await expect(first).toContainText("Quaking aspen");
  await expect(first).toContainText(/strong match/i);
  await first.getByRole("button", { name: "It's this one" }).click();
  await expect(page.getByLabel("Where")).toHaveValue("trail:greenmtn");
  await page.getByRole("button", { name: "Save to my atlas" }).click();

  const obs = page.getByRole("dialog");
  await expect(obs.getByRole("heading", { name: "Quaking aspen" })).toBeVisible();
  await expect(obs.getByRole("img", { name: /your photo of quaking aspen/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "My Atlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: /quaking aspen, found 1 time/i })).toBeVisible();
  await noOverflow(page);

  // the full-size photo is in IndexedDB and survives a reload
  await page.reload();
  await page.getByRole("button", { name: /quaking aspen, found 1 time/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: /green mountain loop/i }).first().waitFor();
  const blobImgs = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("co-field-atlas"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    return new Promise<number>((res) => { const c = db.transaction("photos").objectStore("photos").count(); c.onsuccess = () => res(c.result); });
  });
  expect(blobImgs).toBe(1);
  await page.keyboard.press("Escape");

  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Quests" }).click();
  const q = page.locator("li.quest", { hasText: "Three trees, one outing" });
  await expect(q.locator(".quest-count")).toContainText("1 / 3");
  await noOverflow(page);
});

test("fall color and dark-sky layers, with a leaf check", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /fall color/i }).click();
  await expect(page.locator("g.mark-diamond")).toHaveCount(40);
  await page.getByRole("region", { name: "Fall color spots" }).getByRole("button", { name: /kenosha pass/i }).first().click();
  const d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Log a leaf check" }).click();
  await d.getByLabel(/how much color/i).fill("90");
  await d.getByRole("button", { name: "Save leaf check" }).click();
  await expect(d.getByText(/from your leaf check/i)).toBeVisible();
  await page.goBack();
  await page.getByRole("tab", { name: /dark skies/i }).click();
  await expect(page.locator("g.mark-dot")).toHaveCount(21);
  await page.getByRole("region", { name: "Dark-sky sites" }).getByRole("button", { name: /great sand dunes/i }).click();
  await expect(page.getByRole("dialog").getByRole("region", { name: "Tonight's sky" })).toContainText(/sunset/i);
  await noOverflow(page);
});

test("species pages credit their photo and show Colorado records", async ({ page }) => {
  await page.goto("/#species=quaking-aspen");
  const d = page.getByRole("dialog");
  await expect(d.locator(".sp-hero figcaption")).toContainText("Test Observer");
  await expect(d.getByRole("button", { name: /july: 14 records/i })).toBeVisible();
  await d.getByRole("button", { name: /narrowleaf cottonwood/i }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Narrowleaf cottonwood" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Quaking aspen" })).toBeVisible();
});

test("tab bar and key controls are finger-sized on phones", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1000) >= 900, "phone layouts only");
  await page.goto("/#identify");
  await page.getByRole("button", { name: /no photo/i }).click();
  await page.getByRole("button", { name: /a wildflower/i }).click();
  for (const s of [".tab", ".q-choice", ".pa-btn"]) {
    const boxes = await page.locator(s).evaluateAll((els) => els.slice(0, 8).map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]));
    for (const [w, h] of boxes) expect(Math.min(w, h), `${s} ${w}x${h}`).toBeGreaterThanOrEqual(44);
  }
  // the tab bar sits clear of the bottom edge and covers nothing it shouldn't
  const bar = (await page.locator(".tabbar").boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
});
