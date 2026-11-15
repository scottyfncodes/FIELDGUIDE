import { expect, test } from "@playwright/test";
import { stubNetwork } from "./stubs";

/* What the GITCRAFT remediation fixed, kept fixed: a broken screen shows a
   card instead of a blank page and leaves Safety reachable; the tab bar never
   sits over the page; small controls take a 44px tap. Errors are forced from
   outside the app (a patched Date method), so nothing test-only ships. */

/** Makes the Explore title card throw while it renders; nothing else formats a date this way. */
const breakExplore = () => {
  const real = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function (this: Date, l?: Intl.LocalesArgument, o?: Intl.DateTimeFormatOptions) {
    if (o && o.day === "numeric" && o.month === "short" && o.year === "numeric" && !o.weekday) throw new Error("forced render error");
    return real.call(this, l, o);
  };
};

test("a broken Explore shows the fallback and Safety still opens from the tab bar", async ({ page }) => {
  await stubNetwork(page, []);
  await page.addInitScript(breakExplore);
  await page.goto("/");
  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: /this screen couldn't be drawn/i })).toBeVisible();
  await expect(alert.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(alert.getByRole("button", { name: "Reload the app" })).toBeVisible();
  /* the rest of the app is alive: the tab bar works and the guide draws */
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Safety" }).click();
  await expect(page.getByRole("heading", { name: /safety & survival/i })).toBeVisible();
  await page.getByRole("button", { name: "Severe bleeding" }).click();
  await expect(page.locator(".safety h2").first()).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  /* and the card's own shortcut goes to the same place */
  await page.goto("/");
  await page.getByRole("alert").getByRole("button", { name: "Open the Safety guide" }).click();
  await expect(page.getByRole("heading", { name: /safety & survival/i })).toBeVisible();
});

test("a broken app shell falls back to a card that opens the Safety guide on its own", async ({ page }) => {
  await stubNetwork(page, []);
  /* a cached forecast makes the header format a time; that call is made to throw */
  await page.addInitScript(() => {
    const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });
    localStorage.setItem("co-trail-wx-v2", JSON.stringify({ ts: Date.now(), day, byTrail: {} }));
    Date.prototype.toLocaleTimeString = () => { throw new Error("forced shell error"); };
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /field guide hit a problem/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911");
  await page.getByRole("button", { name: "Open the Safety guide" }).click();
  await expect(page.getByRole("heading", { name: /safety & survival/i })).toBeVisible();
  await expect(page.getByText(/showing the safety guide only/i)).toBeVisible();
  await page.getByRole("button", { name: "Start emergency triage" }).click();
  await expect(page.locator(".safety h2").first()).toBeVisible();
  await expect(page).toHaveURL(/#safety&flow=entry/);
});

test("the tab bar never sits over page content", async ({ page }) => {
  await stubNetwork(page, []);
  const wide = page.viewportSize()!.width >= 900;
  for (const hash of ["", "#identify", "#atlas", "#quests", "#safety"]) {
    await page.goto("/" + hash);
    await expect(page.locator(".tabbar")).toBeVisible();
    const m = await page.evaluate(() => {
      const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const bar = r(".tabbar"), head = r(".appbar"), body = r(".tab-body");
      return { barTop: bar.top, barBottom: bar.bottom, headBottom: head.bottom, bodyTop: body.top,
        padBottom: parseFloat(getComputedStyle(document.querySelector(".app")!).paddingBottom), barH: bar.height, vh: innerHeight };
    });
    if (wide) {
      /* desktop: the bar lives inside the header, so the page starts below it */
      expect(m.barBottom, hash).toBeLessThanOrEqual(m.headBottom + 0.5);
      expect(m.bodyTop, hash).toBeGreaterThanOrEqual(m.barBottom - 0.5);
    } else {
      /* phone: fixed to the bottom edge, with that much room reserved under the page */
      expect(m.barBottom, hash).toBeLessThanOrEqual(m.vh + 0.5);
      expect(m.padBottom, hash).toBeGreaterThanOrEqual(m.barH - 0.5);
    }
  }
  /* scrolled to the very end, the last thing on the page is not under the bar */
  await page.goto("/#safety");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const clear = await page.evaluate(() => {
    const last = document.querySelector(".safety")!.getBoundingClientRect(), bar = document.querySelector(".tabbar")!.getBoundingClientRect();
    return bar.top < innerHeight / 2 ? last.top >= 0 || last.bottom > bar.bottom : last.bottom <= bar.top + 0.5;
  });
  expect(clear).toBe(true);
});

test("small controls take a 44px tap, and pressing one shows it", async ({ page }) => {
  await stubNetwork(page, []);
  /** the control still answers 21px from its centre in every direction */
  const tapArea = (sel: string) => page.locator(sel).first().evaluate((e) => {
    e.scrollIntoView({ block: "center" });
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return [[0, -21], [0, 21], [-21, 0], [21, 0]].every(([dx, dy]) => { const h = document.elementFromPoint(cx + dx, cy + dy); return !!h && e.contains(h); });
  });
  await page.goto("/");
  for (const sel of [".wx-btn", ".layer-tab", ".fchip"]) expect(await tapArea(sel), sel).toBe(true);
  await page.goto("/#trail=greenmtn");
  for (const sel of [".det-act", ".seg-btn"]) expect(await tapArea(sel), sel).toBe(true);
  await page.goto("/#safety&flow=bleeding");
  expect(await tapArea(".sa-save"), ".sa-save").toBe(true);

  /* pressed: the paper tone darkens while the pointer is down */
  await page.goto("/");
  const tab = page.locator(".layer-tab:not(.on)").first();
  await tab.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const bg = () => tab.evaluate((e) => getComputedStyle(e).backgroundColor);
  const box = (await tab.boundingBox())!;
  await page.mouse.move(2, 2);
  const rest = await bg();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(bg).not.toBe(rest);
  await page.mouse.move(2, 2);
  await page.mouse.up();
});
