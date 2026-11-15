# App icons: sources and licensing status

A record of where the six icon files come from and what is and is not known
about their licence. Nothing here is assumed: each line says how it was
checked, and anything that could not be checked is marked **unverified**.

Last checked 2026-11-15 against commit `71d39d1`.

## The files

| File | What it is | How it is made | Used by |
| --- | --- | --- | --- |
| `design/icon.svg` | The master artwork, 1024 by 1024, 19 lines of hand-written SVG | Written directly in this repository | `scripts/make-icons.mjs` |
| `public/icon.svg` | Favicon | Byte-for-byte copy of the master (same SHA-256, `e9078b5c…`) | `index.html` |
| `public/icon-180.png` | Apple touch icon, 180 by 180 | Rendered from the master | `index.html`, service worker shell |
| `public/icon-192.png` | PWA icon, 192 by 192 | Rendered from the master | `index.html`, `manifest.json`, service worker shell |
| `public/icon-512.png` | PWA icon, 512 by 512, and the link-preview image | Rendered from the master | `manifest.json`, `index.html` (`og:image`) |
| `public/icon-maskable-512.png` | Maskable PWA icon, 512 by 512 | Rendered from the master; identical bytes to `icon-512.png` (same SHA-256, `a93fca02…`) | `manifest.json` |

`npm run icons` regenerates every PNG and the favicon from `design/icon.svg`
using the Playwright Chromium the tests already use. Change the master, never
the outputs.

## Source

Verified from the repository:

- The master first appears in commit `820ed21` (2026-09-25, "New Home Screen
  icon: a topo-map summit with the trail to the top"), added as a new file. The
  PNGs it replaced date from commit `1dc581f` (2026-09-24).
- Both commits were authored in Claude Code sessions for the repository owner
  (commit author `Claude`, with a `Co-Authored-By: Claude` trailer). The
  artwork was written as SVG code in that session; it was not imported as a
  file.
- The SVG contains only its own shapes: no embedded raster image, no font, no
  external reference of any kind (the only URL in the file is the SVG
  namespace).
- The file and its commit message name no third-party source, stock asset,
  icon set or template.

**Unverified:** that the design resembles no existing third-party mark or
artwork. The repository history can show the file was written here; it cannot
show that nothing similar exists elsewhere. No similarity search has been run.

## Licence

- **No licence is declared.** The repository has no `LICENSE` file,
  `package.json` has no `license` field (it is marked `private`), and neither
  the icon files nor the README state terms for the artwork.
- **Unverified: who holds rights in the artwork and on what terms.** The icon
  was generated in an AI coding session at the owner's direction. Whether and
  how that affects ownership depends on the tool's terms and on the law where
  the owner is; this document does not settle it and should not be read as
  legal advice.
- No third-party licence obligation (attribution, share-alike, non-commercial)
  was found, because no third-party source was found. That is an absence of
  evidence in the repository, not a clearance.

## What would close this

These are the owner's decisions, not something a contributor can fill in:

1. State the terms for the artwork, either a repository `LICENSE` that covers
   it or a line in this file ("all rights reserved", or a named licence).
2. If the icon will be used as a brand mark beyond this app, run a similarity
   check and record the result here.

Until then, GITCRAFT's asset audit will keep reporting these six files as
having no known licence. That is the accurate status.
