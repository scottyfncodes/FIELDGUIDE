# CO Field Atlas: notes for contributors and agents

CO Field Atlas merged CO Trail Atlas, Leaf Hunter and LOOKUP; docs/CONSOLIDATION.md is the map.

The look is a USGS quad sheet framed like a storybook film: paper, ink, pine and quad-red,
Archivo for names and reading text, IBM Plex Mono for map-style labels, and Jost (a Futura
cut) only for title cards and intertitles. Each tab and sheet is a scene with its own color
block, set by `data-scene` (`--scene`, `--scene-ink`, `--scene-accent`, `--scene-soft`,
`--scene-deep` in `index.css`): Explore and trails forest and parchment, Identify powder blue
and mustard, My Atlas and plants sage and terracotta, Quests mustard and burgundy, fall-color
places burgundy and dusty pink, dark skies night and powder. Favor centered, symmetrical
compositions and double rules. Keep new UI in that voice. Foliage colors mean foliage
status; don't reuse them for anything else.

Run `npm run check` (typecheck, unit tests, build, e2e) before pushing.

- Never invent a fact or a number. Label what kind of claim it is with the `Tag` component
  (field guide, your record, suggestion, estimate, computed, iNaturalist). Unknown stays unknown.
- Identification is a key over the user's answers, not image analysis. Never word results as certain.
- Match iNaturalist records to guide species by taxon id, never by name. A model's
  suggested name is resolved to a taxon by exact scientific name once, then only the id is used.
- No preset starting towns: discovery starts from the person's location or a place they
  typed. Distances are straight lines unless routed; say so. docs/DISCOVERY.md has the sources.
- Photo recognition is a suggestion from the picture alone, capped by photo quality.
  Location is context for ranking within a tier, never proof. Never send location to the model.
- Don't change or remove the `co-trail-*` localStorage keys: existing users' logs live there.
- Quest progress is derived from saved data only.
- `src/lib/astro` and `src/lib/foliage` are verbatim ports; change them upstream too.

## Design guardrails

Avoid generic AI-site patterns. Design should always be intentional. Always on purpose.

### Icons & type
- Don't default to Lucide for every icon. Use fewer icons, and pick or draw ones that fit the project.
- No emojis in headings, cards, or button labels.
- No sparkle/AI star icons anywhere.
- Don't default to Inter, Geist, or Space Grotesk. Choose type that fits the project's personality.

### Layout
- No row of 3 identical feature cards with icon + title + one-liner.
- No bento grids of mismatched stat tiles.
- No fake terminal windows or "npx something init" snippets unless the product has a real CLI.
- No placeholder product shots ("screenshot coming soon", gradient boxes in browser chrome). Use real screens or cut the section.

### Color & effects
- No default purple-on-black palette.
- No liquid glass / frosted blur cards over gradient backgrounds.
- No blurred radial gradient orbs as decoration.
- No dot-grid background texture.
- No rainbow-coded cards where each tile gets its own pastel. Color should mean something.

### Motion
- Arrows on buttons only where they mean "go somewhere," no animated arrow nudges.
- Hover effects only on clickable things, and subtle. No lift-and-scale on every card.

### Copy
- No em dashes in UI copy.
- No "It's not X, it's Y" lines.
- No hype phrasing ("blazing fast", "fort-knox secure", "AI magic").
- No made-up stats ("10x", "99.9%", "120+", "∞") unless they're real.
