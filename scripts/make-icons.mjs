/* Renders every app icon from design/icon.svg:  npm run icons
   Uses the Playwright Chromium the e2e tests already depend on. */
import fs from "node:fs";
import { chromium } from "@playwright/test";

const svg = fs.readFileSync("design/icon.svg", "utf8");

const outputs = [
  { file: "public/icon-180.png", size: 180, src: svg },          // apple-touch-icon
  { file: "public/icon-192.png", size: 192, src: svg },
  { file: "public/icon-512.png", size: 512, src: svg },
  { file: "public/icon-maskable-512.png", size: 512, src: svg },  // full-bleed art: safe to crop
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, src } of outputs) {
  await page.setViewportSize({ width: size, height: size });
  const uri = "data:image/svg+xml;base64," + Buffer.from(src).toString("base64");
  await page.setContent(`<body style="margin:0"><img src="${uri}" width="${size}" height="${size}" style="display:block"></body>`);
  await page.locator("img").evaluate((img) => img.decode());
  await page.screenshot({ path: file, omitBackground: false });
  console.log("wrote", file);
}
await browser.close();

fs.copyFileSync("design/icon.svg", "public/icon.svg"); // crisp favicon for browser tabs
console.log("wrote public/icon.svg");
