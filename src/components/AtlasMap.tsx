import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Log, StartPoint, Verdict } from "../data/types";
import { CITIES, DIVIDE, INTERSTATES, NEIGHBORS, RANGE_LABELS, REGIONS, STATE } from "../data/geography";
import { ringMiles } from "../lib/geo";

/* ============================================================
   THE QUAD SHEET
   An SVG atlas page that fills its container. Geography is drawn in
   "world" units (an equirectangular projection corrected for Colorado's
   latitude, so the state has its true proportions); markers and text are
   placed in screen pixels so they stay crisp and tappable at any zoom.

   Gestures (the Google-Maps model from v7, kept intact):
     mouse  drag pans · wheel zooms at the cursor · double-click zooms
     touch  one finger pans · fling glides · pinch pans + zooms ·
            double-tap zooms · double-tap-then-drag = one-handed zoom
     keys   arrows pan · + / − zoom · 0 resets
   A tap picks the nearest trail; a tap on a tight cluster zooms into it.
   ============================================================ */

const COS = Math.cos((39 * Math.PI) / 180);
const U = 100; // world units per degree of latitude
const LON0 = -109.6, LAT0 = 41.3;
export const wx = (lon: number) => (lon - LON0) * COS * U;
export const wy = (lat: number) => (LAT0 - lat) * U;

const S_LEFT = wx(STATE.west), S_RIGHT = wx(STATE.east), S_TOP = wy(STATE.north), S_BOTTOM = wy(STATE.south);
const S_W = S_RIGHT - S_LEFT, S_H = S_BOTTOM - S_TOP;
const PAD = 26; // world units of paper you can pan past the state line
const K_MAX = 14;
const HIT_PX = 24;
const ZOOM_UI_W = 58;
/* approx height of the selected-trail card docked over the bottom of the map (it wraps on phones) */
const previewH = (w: number) => (w < 420 ? 180 : 130);

/* Decorative quad-sheet contour texture, in world units (the v7 squiggles, re-fit to the state) */
const CONTOURS = [
  "M40,120 C120,90 180,140 260,110 C340,80 400,150 470,120",
  "M60,190 C140,160 200,210 280,180 C360,150 420,220 500,190",
  "M30,270 C110,240 190,290 270,255 C350,225 430,295 510,260",
  "M80,340 C160,310 230,360 310,330 C390,300 460,365 540,335",
  "M300,70 C380,45 440,95 520,70 C600,45 650,100 720,80",
  "M480,300 C550,275 610,325 690,295",
  "M150,415 C230,390 300,435 380,410 C460,385 530,435 610,410",
];
const CONTOUR_T = `translate(${S_LEFT} ${S_TOP}) scale(${S_W / 760} ${S_H / 470})`;

const pathOf = (pts: [number, number][]) =>
  pts.map(([lon, lat], i) => `${i ? "L" : "M"}${wx(lon).toFixed(1)},${wy(lat).toFixed(1)}`).join(" ");
const DIVIDE_D = pathOf(DIVIDE);
const INTERSTATE_D = INTERSTATES.map((r) => ({ n: r.n, d: pathOf(r.path) }));

interface View { cx: number; cy: number; k: number }
const STATE_VIEW: View = { cx: S_LEFT + S_W / 2, cy: S_TOP + S_H / 2, k: 1 };

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const textW = (s: string, px: number) => s.length * px * 0.6 + 6;

/* Anything with a position can go on the sheet. Trails carry an area (for the
   region badges) and a view rating (label priority); other layers don't. */
export interface MapPoint { id: string; name: string; lat: number; lon: number; area?: string; views?: number }
type Trail = MapPoint;

export interface AtlasMapHandle {
  flyToTrails: (ts: Trail[]) => void;
  flyToTrail: (t: Trail) => void;
  reset: () => void;
}

interface Props {
  trails: Trail[];
  /** every trail in the atlas — the home view frames these */
  allTrails: Trail[];
  log: Log;
  verdictFor: (t: Trail) => Verdict | null;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onRegion: (key: string) => void;
  /** the search point, when there is one: a star and estimated drive rings */
  start: StartPoint | null;
  /** marker shape for this layer: survey triangle (trails), leaf diamond (color), star dot (dark sky) */
  shape?: "tri" | "diamond" | "dot";
  /** extra class per marker, e.g. a foliage status */
  markClass?: (t: MapPoint) => string;
  /** what the markers are, for the map's accessible name */
  noun?: string;
  children?: ReactNode;
}

export const AtlasMap = forwardRef<AtlasMapHandle, Props>(function AtlasMap(
  { trails, allTrails, log, verdictFor, selected, onSelect, onRegion, start, shape = "tri", markClass, noun = "trails", children }, ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 360, h: 320 });
  const sizeRef = useRef(size);
  const [view, setView] = useState<View>(STATE_VIEW);
  const viewRef = useRef(view);

  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const lastMid = useRef<{ x: number; y: number } | null>(null);
  const dragDist = useRef(0);
  const lastTap = useRef(0);
  const touchDblZoom = useRef(0);
  const dtZoom = useRef<{ sx: number; sy: number; startY: number; v0: View; moved: boolean } | null>(null);
  const velSamples = useRef<{ x: number; y: number; t: number }[]>([]);
  const rafId = useRef<number | null>(null);
  const tapTargets = useRef<{ rects: { key: string; r: Rect }[] }>({ rects: [] });
  const interacted = useRef(false); // until the user moves the map, resizes re-frame it
  const tapPending = useRef(false);

  /* ---- sizing ---- */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || 360, h = el.clientHeight || 320;
      if (w !== sizeRef.current.w || h !== sizeRef.current.h) {
        sizeRef.current = { w, h };
        setSize({ w, h });
        applyView(interacted.current ? viewRef.current : homeView());
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseScale = () => {
    const { w, h } = sizeRef.current;
    return Math.min(w / (S_W + 12), h / (S_H + 12));
  };

  const clampView = (v: View): View => {
    const k = Math.min(K_MAX, Math.max(1, v.k));
    const S = baseScale() * k;
    const { w, h } = sizeRef.current;
    const axis = (c: number, lo: number, hi: number, half: number) =>
      hi - lo <= 2 * half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, c));
    return {
      k,
      cx: axis(v.cx, S_LEFT - PAD, S_RIGHT + PAD, w / 2 / S),
      cy: axis(v.cy, S_TOP - PAD, S_BOTTOM + PAD, h / 2 / S),
    };
  };

  /* single write path so gestures + animations never fight over stale state */
  const applyView = (v: View) => {
    const c = clampView(v);
    viewRef.current = c;
    setView(c);
  };

  const stopMotion = () => {
    if (rafId.current != null) cancelAnimationFrame(rafId.current);
    rafId.current = null;
  };
  useEffect(() => () => stopMotion(), []);

  const toLocal = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  /* world point under a screen point stays put while zooming */
  const zoomView = (v: View, sx: number, sy: number, k2: number): View => {
    const { w, h } = sizeRef.current;
    const S = baseScale() * v.k, S2 = baseScale() * Math.min(K_MAX, Math.max(1, k2));
    const wxp = v.cx + (sx - w / 2) / S, wyp = v.cy + (sy - h / 2) / S;
    return { k: k2, cx: wxp - (sx - w / 2) / S2, cy: wyp - (sy - h / 2) / S2 };
  };

  const animate = (target: View, dur: number) => {
    stopMotion();
    const from = viewRef.current;
    const to = clampView(target);
    if (reducedMotion() || dur <= 0) { applyView(to); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      applyView({
        k: from.k * Math.pow(to.k / from.k, e),
        cx: from.cx + (to.cx - from.cx) * e,
        cy: from.cy + (to.cy - from.cy) * e,
      });
      if (p < 1) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  };

  const animateZoomAt = (sx: number, sy: number, factor: number, dur = 240) => {
    const from = viewRef.current;
    const k2 = Math.min(K_MAX, Math.max(1, from.k * factor));
    if (k2 === from.k) return;
    animate(zoomView(from, sx, sy, k2), dur);
  };

  /* view that frames a set of trails, leaving room for the zoom buttons + preview card */
  const viewFor = (ts: Trail[], maxK: number, fillW: number, fillH: number): View => {
    if (!ts.length) return STATE_VIEW;
    const { w, h } = sizeRef.current;
    const xs = ts.map((t) => wx(t.lon)), ys = ts.map((t) => wy(t.lat));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const bw = Math.max(x1 - x0, 12), bh = Math.max(y1 - y0, 12);
    const usableW = w - ZOOM_UI_W; // keep the framed trails out from under the zoom buttons
    const k = Math.min(maxK, Math.max(1, Math.min((usableW * fillW) / (bw * baseScale()), (h * fillH) / (bh * baseScale()))));
    const S = baseScale() * k;
    return { k, cx: (x0 + x1) / 2 + ZOOM_UI_W / 2 / S, cy: (y0 + y1) / 2 };
  };
  const homeView = () => viewFor(allTrails, 3, 0.8, 0.74);
  const fitTrails = (ts: Trail[], maxK = 9) => animate(viewFor(ts, maxK, 0.7, 0.58), 420);
  const goHome = () => { interacted.current = false; animate(homeView(), 340); };

  useImperativeHandle(ref, () => ({
    flyToTrails: (ts) => { interacted.current = true; fitTrails(ts); },
    flyToTrail: (t) => { interacted.current = true; animate({ k: Math.max(viewRef.current.k, 6), cx: wx(t.lon), cy: wy(t.lat) }, 420); },
    reset: goHome,
  }));

  /* release a drag with speed and the map glides to a stop */
  const startInertia = () => {
    if (reducedMotion()) return;
    const now = performance.now();
    const recent = velSamples.current.filter((s) => now - s.t < 110);
    if (recent.length < 2) return;
    const a = recent[0], b = recent[recent.length - 1];
    const dt = b.t - a.t;
    if (dt <= 0) return;
    let vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt; // px / ms
    if (Math.hypot(vx, vy) < 0.12) return;
    stopMotion();
    let last = performance.now();
    const step = (t: number) => {
      const d = Math.min(50, t - last); last = t;
      const v = viewRef.current, S = baseScale() * v.k;
      applyView({ ...v, cx: v.cx - (vx * d) / S, cy: v.cy - (vy * d) / S });
      const decay = Math.exp(-d / 300); // friction
      vx *= decay; vy *= decay;
      if (Math.hypot(vx, vy) > 0.015) rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
  };

  /* wheel zoom + stop the page from scrolling under a map drag (native, non-passive) */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopMotion();
      interacted.current = true;
      const p = toLocal(e.clientX, e.clientY);
      const v = viewRef.current;
      applyView(zoomView(v, p.x, p.y, v.k * Math.exp(-e.deltaY * 0.0022)));
    };
    const onTouchMove = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  /* ---- screen placement (recomputed each render; ~50 markers) ---- */
  const { w, h } = size;
  const S = baseScale() * view.k;
  const sx = (lon: number) => w / 2 + (wx(lon) - view.cx) * S;
  const sy = (lat: number) => h / 2 + (wy(lat) - view.cy) * S;

  const pts = trails.map((t) => ({ t, x: sx(t.lon), y: sy(t.lat) }));

  /* tap: nearest trail wins; an ambiguous tap on a cluster zooms into it */
  const handleTap = (clientX: number, clientY: number) => {
    const p = toLocal(clientX, clientY);
    const badge = tapTargets.current.rects.find((b) =>
      p.x >= b.r.x - 6 && p.x <= b.r.x + b.r.w + 6 && p.y >= b.r.y - 8 && p.y <= b.r.y + b.r.h + 8);
    const hits = pts
      .map((m) => ({ ...m, d: Math.hypot(m.x - p.x, m.y - p.y) }))
      .filter((m) => m.d < HIT_PX)
      .sort((a, b) => a.d - b.d);
    if (!hits.length) {
      if (badge) { onRegion(badge.key); return; }
      onSelect(null);
      return;
    }
    const [first, second] = hits;
    const clear = !second || second.d - first.d > 10 || view.k >= K_MAX * 0.8;
    const spread = second ? Math.max(...hits.map((m) => Math.hypot(m.x - first.x, m.y - first.y))) : 0;
    if (clear || spread > 30) {
      onSelect(first.t.id);
      /* keep the picked trail visible above the preview card docked at the bottom */
      const cardTop = h - previewH(w);
      if (first.y > cardTop - 16) {
        const v = viewRef.current;
        animate({ ...v, cy: v.cy + (first.y - cardTop / 2) / (baseScale() * v.k) }, 260);
      }
      return;
    }
    /* zoom just enough to pull the cluster apart, centered on it */
    let dmin = Infinity;
    hits.forEach((a, i) => hits.slice(i + 1).forEach((b) => { dmin = Math.min(dmin, Math.hypot(a.x - b.x, a.y - b.y)); }));
    const factor = Math.min(5, Math.max(1.8, 40 / Math.max(dmin, 1)));
    const cx = hits.reduce((s, m) => s + m.x, 0) / hits.length, cy = hits.reduce((s, m) => s + m.y, 0) / hits.length;
    const v = viewRef.current, Sv = baseScale() * v.k;
    animate({ k: Math.min(K_MAX, v.k * factor), cx: v.cx + (cx - w / 2) / Sv, cy: v.cy + (cy - h / 2) / Sv }, 320);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    stopMotion();
    tapPending.current = false;
    interacted.current = true;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (ptrs.current.size === 1) {
      dragDist.current = 0;
      velSamples.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      const now = Date.now();
      if (e.pointerType === "touch" && now - lastTap.current < 300) {
        /* second tap — zoom on release, or hold + drag for continuous zoom */
        const p = toLocal(e.clientX, e.clientY);
        dtZoom.current = { sx: p.x, sy: p.y, startY: e.clientY, v0: { ...viewRef.current }, moved: false };
        touchDblZoom.current = now;
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
    if (ptrs.current.size === 2) {
      dtZoom.current = null;
      const [a, b] = [...ptrs.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      lastMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) {
      dragDist.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      if (dtZoom.current) {
        /* double-tap-and-drag zoom, anchored where you tapped (drag down = in) */
        const z = dtZoom.current;
        if (Math.abs(e.clientY - z.startY) > 4) z.moved = true;
        applyView(zoomView(z.v0, z.sx, z.sy, z.v0.k * Math.pow(2, (e.clientY - z.startY) / 160)));
        return;
      }
      velSamples.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (velSamples.current.length > 8) velSamples.current.shift();
      const v = viewRef.current, Sv = baseScale() * v.k;
      applyView({ ...v, cx: v.cx - (e.clientX - prev.x) / Sv, cy: v.cy - (e.clientY - prev.y) / Sv });
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      dragDist.current += 99; // a pinch is never a tap
      let next = viewRef.current;
      if (lastMid.current) {
        const Sv = baseScale() * next.k;
        next = { ...next, cx: next.cx - (mid.x - lastMid.current.x) / Sv, cy: next.cy - (mid.y - lastMid.current.y) / Sv };
      }
      if (pinch.current) {
        const p = toLocal(mid.x, mid.y);
        next = zoomView(next, p.x, p.y, next.k * (d / pinch.current));
      }
      applyView(next);
      pinch.current = d;
      lastMid.current = mid;
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const wasSingle = ptrs.current.size === 1 && ptrs.current.has(e.pointerId);
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) { pinch.current = null; lastMid.current = null; }
    if (!wasSingle) return;
    if (dtZoom.current) {
      if (!dtZoom.current.moved) animateZoomAt(dtZoom.current.sx, dtZoom.current.sy, 1.9);
      dtZoom.current = null;
    } else if (dragDist.current > 7) {
      startInertia();
    } else if (e.type === "pointerup") {
      tapPending.current = true; // resolved in onClick — see below
    }
  };

  /* Taps resolve on the click that follows pointerup, not on pointerup itself:
     selecting renders the preview card, and if that happened first the
     browser's click would land on the fresh card under the finger (a ghost tap). */
  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!tapPending.current) return;
    tapPending.current = false;
    handleTap(e.clientX, e.clientY);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 60 / S, v = viewRef.current;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => applyView({ ...v, cx: v.cx - step }),
      ArrowRight: () => applyView({ ...v, cx: v.cx + step }),
      ArrowUp: () => applyView({ ...v, cy: v.cy - step }),
      ArrowDown: () => applyView({ ...v, cy: v.cy + step }),
      "+": () => animateZoomAt(w / 2, h / 2, 1.5),
      "=": () => animateZoomAt(w / 2, h / 2, 1.5),
      "-": () => animateZoomAt(w / 2, h / 2, 1 / 1.5),
      "0": goHome,
    };
    if (keys[e.key]) { e.preventDefault(); stopMotion(); interacted.current = true; keys[e.key](); }
  };

  /* ---- labels, placed greedily so nothing overlaps ---- */
  const placed: Rect[] = [];
  const place = (cands: Rect[]) => {
    for (const r of cands) {
      if (r.x < 4 || r.x + r.w > w - 4 || r.y < 4 || r.y + r.h > h - 4) continue;
      if (placed.some((p) => overlaps(p, r))) continue;
      placed.push(r);
      return r;
    }
    return null;
  };
  placed.push({ x: w - ZOOM_UI_W, y: 0, w: ZOOM_UI_W, h: 164 }); // zoom buttons
  // markers themselves reserve their footprint
  const mSize = 7 + Math.min(4, (view.k - 1) * 0.6);
  pts.forEach((m) => placed.push({ x: m.x - mSize, y: m.y - mSize, w: mSize * 2, h: mSize * 2 }));

  const overview = view.k < 1.9;
  const regionBadges: { key: string; label: string; x: number; y: number; r: Rect }[] = [];
  const trailLabels: { id: string; label: string; x: number; y: number }[] = [];

  if (overview) {
    /* biggest regions claim space first */
    REGIONS
      .map((rg) => ({ rg, inR: pts.filter((m) => !!m.t.area && rg.areas.includes(m.t.area)) }))
      .filter((r) => r.inR.length)
      .sort((a, b) => b.inR.length - a.inR.length)
      .forEach(({ rg, inR }) => {
      const label = `${rg.short} · ${inR.length}`;
      const bw = textW(label, 10) + 8, bh = 18;
      const x0 = Math.min(...inR.map((m) => m.x)), x1 = Math.max(...inR.map((m) => m.x));
      const y0 = Math.min(...inR.map((m) => m.y)), y1 = Math.max(...inR.map((m) => m.y));
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const cands: Rect[] = [];
      for (const off of [4, 16, 30]) {
        cands.push(
          { x: cx - bw / 2, y: y0 - mSize - bh - off, w: bw, h: bh },
          { x: cx - bw / 2, y: y1 + mSize + off, w: bw, h: bh },
          { x: x1 + mSize + off + 2, y: cy - bh / 2, w: bw, h: bh },
          { x: x0 - mSize - off - 2 - bw, y: cy - bh / 2, w: bw, h: bh },
          { x: x0 - bw * 0.5, y: y0 - mSize - bh - off, w: bw, h: bh },
          { x: x1 - bw * 0.5, y: y1 + mSize + off, w: bw, h: bh },
        );
      }
      const r = place(cands);
      if (r) regionBadges.push({ key: rg.key, label, x: r.x, y: r.y, r });
    });
  } else {
    const order = pts.slice().sort((a, b) =>
      (b.t.id === selected ? 1 : 0) - (a.t.id === selected ? 1 : 0) || (b.t.views ?? 0) - (a.t.views ?? 0));
    order.forEach((m) => {
      if (m.x < -20 || m.x > w + 20 || m.y < -20 || m.y > h + 20) return;
      const lw = textW(m.t.name, 11.5), lh = 15;
      const r = place([
        { x: m.x + mSize + 3, y: m.y - lh / 2, w: lw, h: lh },
        { x: m.x - mSize - 3 - lw, y: m.y - lh / 2, w: lw, h: lh },
        { x: m.x - lw / 2, y: m.y + mSize + 2, w: lw, h: lh },
      ]);
      if (r) trailLabels.push({ id: m.t.id, label: m.t.name, x: r.x + 3, y: r.y + lh / 2 + 4 });
    });
  }
  /* drive-ring captions go wherever there's room left */
  const ringLabels: { hr: number; x: number; y: number }[] = [];
  if (start) [1, 2, 4].forEach((hr) => {
    const ry = (ringMiles(hr) / 69) * U * S;
    const x = sx(start.lon), y = sy(start.lat) - ry - 3;
    const lw = textW(`${hr} HR DRIVE`, 9);
    if (place([{ x: x - lw / 2, y: y - 10, w: lw, h: 12 }])) ringLabels.push({ hr, x, y });
  });
  tapTargets.current.rects = regionBadges.map((b) => ({ key: b.key, r: b.r }));

  const G = `translate(${w / 2 - view.cx * S} ${h / 2 - view.cy * S}) scale(${S})`;
  const onScreen = (x: number, y: number, m = 40) => x > -m && x < w + m && y > -m && y < h + m;
  const selPt = pts.find((m) => m.t.id === selected);

  return (
    <div className="map-frame" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="map"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        data-zoom={view.k.toFixed(3)}
        role="application"
        aria-roledescription="map"
        aria-label={`Map of Colorado with ${trails.length} ${noun}. Arrow keys pan, plus and minus zoom. The list below has the same ${noun}.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        onDoubleClick={(e) => {
          if (Date.now() - touchDblZoom.current < 600) return; // already zoomed via touch double-tap
          const p = toLocal(e.clientX, e.clientY);
          animateZoomAt(p.x, p.y, 1.9);
        }}
      >
        <rect x="0" y="0" width={w} height={h} className="map-paper-out" />
        <g transform={G}>
          <rect x={S_LEFT} y={S_TOP} width={S_W} height={S_H} className="map-state" />
          <g className="contours">
            <g transform={CONTOUR_T}>
              {CONTOURS.map((d, i) => <path key={i} d={d} className="contour" vectorEffect="non-scaling-stroke" />)}
            </g>
          </g>
          {[-108, -107, -106, -105, -104, -103].map((ln) => (
            <line key={ln} x1={wx(ln)} y1={S_TOP} x2={wx(ln)} y2={S_BOTTOM} className="grat" vectorEffect="non-scaling-stroke" />
          ))}
          {[38, 39, 40].map((lt) => (
            <line key={lt} x1={S_LEFT} y1={wy(lt)} x2={S_RIGHT} y2={wy(lt)} className="grat" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={DIVIDE_D} className="divide" vectorEffect="non-scaling-stroke" />
          {INTERSTATE_D.map((r) => <path key={r.n} d={r.d} className="road" vectorEffect="non-scaling-stroke" />)}
          {start && [1, 2, 4].map((hr) => {
            const mi = ringMiles(hr);
            const ry = (mi / 69) * U;
            const rx = (mi / (69 * Math.cos((start.lat * Math.PI) / 180))) * COS * U;
            return <ellipse key={hr} cx={wx(start.lon)} cy={wy(start.lat)} rx={rx} ry={ry} className="ring" vectorEffect="non-scaling-stroke" />;
          })}
          <rect x={S_LEFT} y={S_TOP} width={S_W} height={S_H} className="map-border" vectorEffect="non-scaling-stroke" />
        </g>

        {/* ---- screen-space text ---- */}
        {NEIGHBORS.map((n) => {
          const x = sx(n.lon), y = sy(n.lat);
          return onScreen(x, y, 80) && (
            <text key={n.n} x={x} y={y} className="neighbor-lbl" textAnchor="middle" dominantBaseline="middle"
              transform={n.rot ? `rotate(${n.rot} ${x} ${y})` : undefined}>{n.n}</text>
          );
        })}
        {RANGE_LABELS.map((r) => {
          const x = sx(r.lon), y = sy(r.lat);
          return onScreen(x, y, 80) && (
            <text key={r.n} x={x} y={y} className="range-lbl" textAnchor="middle"
              transform={`rotate(${r.rot} ${x} ${y})`}>{r.n}</text>
          );
        })}
        {view.k >= 1.5 && INTERSTATES.map((r) => {
          const mid = r.path[Math.floor(r.path.length * (r.n === "I-70" ? 0.78 : 0.62))];
          const x = sx(mid[0]), y = sy(mid[1]);
          return onScreen(x, y) && (
            <g key={r.n} transform={`translate(${x} ${y})`} className="shield">
              <rect x="-13" y="-8" width="26" height="16" rx="3" />
              <text y="4" textAnchor="middle">{r.n.slice(2)}</text>
            </g>
          );
        })}
        {CITIES.map((c) => {
          const x = sx(c.lon), y = sy(c.lat);
          if (!onScreen(x, y) || (!c.major && view.k < 1.3 && w < 500)) return null;
          return (
            <g key={c.n} transform={`translate(${x} ${y})`} className="city">
              <rect x="-2.5" y="-2.5" width="5" height="5" />
              <text x="6" y="3.5">{c.n}</text>
            </g>
          );
        })}
        {ringLabels.map((r) => <text key={r.hr} x={r.x} y={r.y} className="ring-lbl" textAnchor="middle">{r.hr} HR DRIVE</text>)}

        {/* ---- trail markers ---- */}
        {pts.map(({ t, x, y }) => {
          if (!onScreen(x, y)) return null;
          const v = verdictFor(t);
          const done = !!log[t.id]?.done;
          const cls = "mark" + (v ? " mark-" + v.toLowerCase() : "") + (done ? " mark-done" : "") + (selected === t.id ? " mark-sel" : "") +
            (shape !== "tri" ? ` mark-${shape}` : "") + (markClass ? " " + markClass(t) : "");
          const s = selected === t.id ? mSize * 1.35 : mSize;
          return (
            <g key={t.id} className={cls} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              {shape === "tri" && <path d={`M0,${-s * 1.05} L${s * 0.95},${s * 0.75} L${-s * 0.95},${s * 0.75} Z`} className="mark-tri" />}
              {shape === "diamond" && <path d={`M0,${-s * 1.1} C${s * 0.8},${-s * 0.5} ${s * 0.8},${s * 0.4} 0,${s * 1.1} C${-s * 0.8},${s * 0.4} ${-s * 0.8},${-s * 0.5} 0,${-s * 1.1} Z`} className="mark-tri" />}
              {shape === "dot" && <circle r={s * 0.85} className="mark-tri" />}
              {done && <path d={`M${-s * 0.35},${s * 0.12} L${-s * 0.08},${s * 0.4} L${s * 0.4},${-s * 0.2}`} className="mark-check" />}
            </g>
          );
        })}
        {selPt && onScreen(selPt.x, selPt.y) && (
          <circle cx={selPt.x} cy={selPt.y - 1} r={mSize * 2.1} className="sel-ring" />
        )}

        {/* start point */}
        {start && onScreen(sx(start.lon), sy(start.lat)) && (
          <g transform={`translate(${sx(start.lon)} ${sy(start.lat)})`}>
            <path d="M0,-9 L2.6,-2.9 L9,-2.6 L4,1.6 L5.6,8 L0,4.4 L-5.6,8 L-4,1.6 L-9,-2.6 L-2.6,-2.9 Z" className="start-star" />
            {!overview && <text x="12" y="4" className="start-lbl">FROM {start.label.toUpperCase()}</text>}
          </g>
        )}

        {trailLabels.map((l) => (
          <text key={l.id} x={l.x} y={l.y}
            className={"mark-lbl" + (l.id === selected ? " mark-lbl-sel" : "")}>{l.label}</text>
        ))}
        {regionBadges.map((b) => (
          <g key={b.key} className="region-badge" transform={`translate(${b.x} ${b.y})`}>
            <rect width={b.r.w} height={b.r.h} />
            <text x={b.r.w / 2} y={12.5} textAnchor="middle">{b.label}</text>
          </g>
        ))}
      </svg>

      <div className="zoom-ui">
        <button type="button" aria-label="Zoom in" className="zbtn" onClick={() => { interacted.current = true; animateZoomAt(w / 2, h / 2, 1.6); }}>+</button>
        <button type="button" aria-label="Zoom out" className="zbtn" onClick={() => { interacted.current = true; animateZoomAt(w / 2, h / 2, 1 / 1.6); }}>−</button>
        <button type="button" aria-label="Zoom map out to every trail" className="zbtn" onClick={goHome}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="14" height="10" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
      </div>
      {children}
    </div>
  );
});
