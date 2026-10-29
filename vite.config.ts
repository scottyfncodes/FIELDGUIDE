/// <reference types="vitest" />
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

/* Stamps the service worker with this build: a version that changes whenever
   any output file changes (so phones pick up the new app), and the list of
   files to precache (so the whole app, Safety guide included, opens offline
   after one visit). */
function swPrecache(): Plugin {
  let outDir = "dist";
  const files: string[] = [];
  return {
    name: "sw-precache",
    apply: "build",
    configResolved(c) { outDir = c.build.outDir; },
    generateBundle(_, bundle) {
      files.length = 0;
      for (const f of Object.values(bundle)) files.push("/" + f.fileName);
    },
    writeBundle() {
      const swPath = join(outDir, "sw.js");
      const list = files.filter((f) => !f.endsWith(".map") && f !== "/index.html").sort();
      const hash = createHash("sha256");
      for (const f of [...list, "/index.html"]) hash.update(f).update(readFileSync(join(outDir, f)));
      const sw = readFileSync(swPath, "utf8")
        .replace('const BUILD = "dev";', `const BUILD = ${JSON.stringify(hash.digest("hex").slice(0, 12))};`)
        .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(list)};`);
      if (sw.includes('const BUILD = "dev"') || sw.includes("const PRECACHE = [];")) throw new Error("sw.js placeholders not found");
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  plugins: [react(), swPrecache()],
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    /* the full-UI flow tests click through many screens; 5 s is too tight on small CI boxes */
    testTimeout: 20_000,
  },
});
