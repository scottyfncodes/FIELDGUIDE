import type { LeafShape } from "../data/species";

/* ---------- DRAWN GLYPHS ----------
   Simple ink drawings in the quad-sheet hand: one leaf silhouette per leaf
   shape (the collectible cards use these when there's no photo) and the four
   tab marks. 48×48 viewBox, stroked in currentColor. */

const LEAF: Record<LeafShape, JSX.Element> = {
  needle: (<>
    <path d="M24 44V8" />
    {[12, 18, 24, 30, 36].map((y) => <path key={y} d={`M24 ${y + 4}l-9-9M24 ${y + 4}l9-9`} />)}
  </>),
  scale: (<>
    <path d="M24 44V30" />
    {[8, 15, 22].map((y) => <path key={y} d={`M24 ${y}c-5 3-7 6-7 9 3 0 5-1 7-3 2 2 4 3 7 3 0-3-2-6-7-9z`} />)}
  </>),
  rounded: (<><path d="M24 7c10 3 15 11 14 20-1 8-7 12-14 12S11 35 10 27C9 18 14 10 24 7z" /><path d="M24 39v6M24 12v27" /></>),
  oval: (<><path d="M24 5c8 6 11 14 11 21s-4 13-11 15c-7-2-11-8-11-15S16 11 24 5z" /><path d="M24 41v5M24 10v31" /></>),
  lance: (<><path d="M24 3c4 9 6 18 6 26 0 6-3 10-6 12-3-2-6-6-6-12 0-8 2-17 6-26z" /><path d="M24 41v5M24 8v33" /></>),
  triangular: (<><path d="M24 7L39 35c-5 3-10 4-15 4s-10-1-15-4L24 7z" /><path d="M24 39v6M24 12v27" /></>),
  lobed: (<><path d="M24 6c3 2 3 5 1 7 4-1 7 1 6 4-1 2-4 2-6 2 5 0 8 2 7 5-1 2-4 2-7 1 4 2 6 5 4 7-2 2-5 0-5-2v9-9c0 2-3 4-5 2-2-2 0-5 4-7-3 1-6 1-7-1-1-3 2-5 7-5-2 0-5 0-6-2-1-3 2-5 6-4-2-2-2-5 1-7z" /><path d="M24 40v6" /></>),
  palmate: (<><path d="M24 40c-3 0-5-2-6-4-5 1-10-2-10-6 3-1 6-1 8 0-4-3-6-8-4-12 4 1 7 4 8 8 0-5 1-11 4-15 3 4 4 10 4 15 1-4 4-7 8-8 2 4 0 9-4 12 2-1 5-1 8 0 0 4-5 7-10 6-1 2-3 4-6 4z" /><path d="M24 40v6M24 14v26M24 30l-9-9M24 30l9-9" /></>),
  compound: (<>
    <path d="M24 46V6" />
    {[10, 20, 30].map((y) => <g key={y}><path d={`M24 ${y + 2}c-4-4-11-4-13-1 3 4 9 4 13 1z`} /><path d={`M24 ${y + 2}c4-4 11-4 13-1-3 4-9 4-13 1z`} /></g>)}
    <path d="M24 6c-3 2-4 5-3 8h6c1-3 0-6-3-8z" />
  </>),
  wedge: (<><path d="M24 44l-9-26c-1-4 1-8 4-9l2 4 3-5 3 5 2-4c3 1 5 5 4 9z" /></>),
  narrow: (<>{[-10, 0, 10].map((dx) => <path key={dx} d={`M${24 + dx * 0.4} 44C${24 + dx * 0.6} 30 ${24 + dx} 18 ${24 + dx * 1.3} 5`} />)}</>),
  heart: (<><path d="M24 41C14 33 9 26 10 19c1-6 6-8 10-6 2 1 3 3 4 5 1-2 2-4 4-5 4-2 9 0 10 6 1 7-4 14-14 22z" /><path d="M24 41v5M24 18v23" /></>),
  feathery: (<>
    <path d="M24 46V5" />
    {[9, 15, 21, 27, 33].map((y, i) => <g key={y}><path d={`M24 ${y + 4}c-3-1-6-3-${8 - i} -6M24 ${y + 4}c3-1 6-3 ${8 - i} -6`} /></g>)}
  </>),
};

export function LeafGlyph({ shape, className, title }: { shape: LeafShape; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={"glyph " + (className ?? "")} role={title ? "img" : undefined}
      aria-label={title} aria-hidden={title ? undefined : true}
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {LEAF[shape]}
    </svg>
  );
}

/* Tab marks: a survey triangle, a viewfinder around a leaf, an open journal, a pennant on a cairn */
const TAB_ICONS = {
  explore: (<><path d="M12 4l9 15H3z" /><path d="M12 10v5" /></>),
  identify: (<><path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4" /><path d="M12 7c3 2 4 4 4 6s-2 4-4 4-4-2-4-4 1-4 4-6z" /><path d="M12 17v-6" /></>),
  atlas: (<><path d="M3 6c3-1 6-1 9 1v13c-3-2-6-2-9-1z" /><path d="M21 6c-3-1-6-1-9 1v13c3-2 6-2 9-1z" /></>),
  quests: (<><path d="M7 21V3" /><path d="M7 4h11l-3 4 3 4H7" /><path d="M4 21h8" /></>),
};

export function TabIcon({ tab }: { tab: keyof typeof TAB_ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {TAB_ICONS[tab]}
    </svg>
  );
}

/* Camera mark for the capture button */
export function CameraMark() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M3 8h4l2-3h6l2 3h4v11H3z" /><circle cx="12" cy="13" r="3.6" />
    </svg>
  );
}
