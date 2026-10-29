import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { stubNetwork } from "./stubs";

/* Safety & Survival on a phone: reachable from the tab bar, readable at
   every iPhone width, usable with the network off after one visit, and
   printable. */

test("opens from the tab bar and walks a triage flow to the call button", async ({ page }) => {
  const errors: string[] = [];
  await stubNetwork(page, errors);
  await page.goto("/");
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Safety" }).click();
  await expect(page.getByRole("heading", { name: /safety & survival/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911");
  await page.getByRole("button", { name: "Cold exposure / hypothermia" }).click();
  await page.getByRole("button", { name: /^No/ }).click();
  await page.getByRole("button", { name: /shivering has stopped/i }).click();
  await expect(page.getByRole("heading", { name: /severe hypothermia/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /call 911 now/i })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: /confused, stumbling/i })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [320, 375, 390, 430]) {
  test(`no sideways scroll or clipped controls at ${width}px`, async ({ page }) => {
    await stubNetwork(page, []);
    await page.setViewportSize({ width, height: 800 });
    for (const hash of ["#safety", "#safety&flow=bleeding:severe", "#safety&topic=signal", "#safety&topic=firstaid", "#safety&topic=live", "#safety&topic=vehicle"]) {
      await page.goto("/" + hash);
      await expect(page.locator(".safety h2").first()).toBeVisible();
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, hash).toBeLessThanOrEqual(0);
      /* every button and link inside the safety screen fits the screen and is at least 40px tall */
      const bad = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".safety button, .safety a.call-btn")]
        .filter((el) => el.offsetParent)
        .map((el) => ({ t: el.textContent?.trim().slice(0, 30), r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.right > window.innerWidth + 0.5 || r.left < -0.5 || r.height < 40)
        .map(({ t }) => t));
      expect(bad, hash).toEqual([]);
    }
  });
}

test.describe("offline", () => {
  test.use({ serviceWorkers: "allow" });
  test("after one visit the app starts with no network, and the safety guide, search and other tabs work", async ({ page, context }) => {
    test.skip(test.info().project.name !== "iphone", "one device is enough for the service worker");
    await stubNetwork(page, []);
    await page.goto("/");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    await context.setOffline(true);
    await page.goto("/#safety");
    await expect(page.getByRole("heading", { name: /safety & survival/i })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /offline/i })).toBeVisible();
    await page.getByRole("searchbox", { name: /search safety/i }).fill("snake");
    await page.getByLabel("Search results").getByRole("button").first().click();
    await expect(page.getByRole("heading", { name: /venomous/i })).toBeVisible();
    await page.goto("/#safety&topic=live");
    await page.getByRole("button", { name: /use my location/i }).isVisible();
    /* the rest of the app is still there */
    await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Explore" }).click();
    await expect(page.getByRole("searchbox", { name: /search the atlas classics/i })).toBeVisible();
    await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Journal" }).click();
    await expect(page.locator(".screen.atlas")).toBeVisible();
    await context.setOffline(false);
  });
});

test("live checks say they need a connection when offline, and never call that an all-clear", async ({ page, context }) => {
  await stubNetwork(page, []);
  await page.goto("/#trail=greenmtn");
  await context.setOffline(true);
  const ready = page.getByRole("region", { name: "Be ready" });
  await ready.getByRole("button", { name: "Check now" }).click();
  await expect(ready.getByText(/you're offline\. live checks need a connection/i).first()).toBeVisible();
  await expect(ready.getByText(/no active alerts/i)).toHaveCount(0);
  await context.setOffline(false);
});

test("the print view prints the whole guide without the app chrome", async ({ page, browserName }) => {
  test.skip(test.info().project.name !== "desktop" || browserName !== "chromium", "PDF output is a desktop Chromium feature");
  await stubNetwork(page, []);
  await page.goto("/#safety&topic=print");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".tabbar")).toBeHidden();
  await expect(page.locator(".appbar")).toBeHidden();
  await expect(page.getByText(/in an emergency call 911/i)).toBeVisible();
  await expect(page.locator(".pr-flow-hd", { hasText: "Severe bleeding" })).toBeVisible();
  const pdf = await page.pdf({ format: "Letter" });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBeGreaterThan(8);
});

test("no API secrets ship in the client bundle", () => {
  const dir = join(process.cwd(), "dist", "assets");
  for (const f of readdirSync(dir)) {
    const txt = readFileSync(join(dir, f), "utf8");
    expect(txt, f).not.toMatch(/sk-ant-[A-Za-z0-9_-]{10,}/);
    expect(txt, f).not.toMatch(/ANTHROPIC_API_KEY\s*[:=]\s*["'][^"']+/);
  }
});
