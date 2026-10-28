import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FoundTrail, Origin } from "../lib/discover";

/* ============================================================
   THE FIELD SHEET
   A quad sheet drawn around wherever the search started: the search point
   at the center, straight-line distance rings, and every trail's real
   mapped geometry. World units are miles east/north of the search point,
   so the rings are true to scale. Strokes and marks stay a fixed pixel
   size at any zoom.

   One finger or the mouse pans; pinch or the wheel zooms; the buttons zoom
   for anyone who can't pinch. A tap picks the nearest trail line. The list
   below the map is the accessible way through the same results.
   ============================================================ */

const MI_PER_DEG = 69;
const HIT_PX = 22;

interface Props {
  origin: Origin;
  radiusMi: number;
  trails: FoundTrail[];
  classics: { id: string; name: string; lat: number; lon: number }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onSelectClassic: (id: string) => void;
  children?: ReactNode;
}

interface View { cx: number; cy: number; k: number }

export function DiscoveryMap({ origin, radiusMi, trails, classics, selected, onSelect, onSelectClassic, children }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 320 });
  const cos = Math.cos((origin.lat * Math.PI) / 180);
  const px = (lon: number) => (lon - origin.lon) * cos * MI_PER_DEG;
  const py = (lat: number) => -(lat - origin.lat) * MI_PER_DEG;
  const fitK = Math.min(size.w, size.h) / (radiusMi * 2.16);
  const [view, setView] = useState<View>({ cx: 0, cy: 0, k: fitK });
  const fitted = useRef(true);

  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* refit when the search changes or the frame resizes (unless the person has moved the map) */
  useEffect(() => { fitted.current = true; setView({ cx: 0, cy: 0, k: fitK }); }, [origin.lat, origin.lon, radiusMi]);
  useEffect(() => { if (fitted.current) setView({ cx: 0, cy: 0, k: fitK }); }, [fitK]);

  const lines = useMemo(() => trails.map((t) => ({
    id: t.id,
    d: t.paths.map((p) => p.map(([la, lo], i) => `${i ? "L" : "M"}${px(lo).toFixed(3)},${py(la).toFixed(3)}`).join("")).join(""),
    pts: t.paths.flatMap((p) => p.filter((_, i) => i % 2 === 0 || i === p.length - 1).map(([la, lo]) => [px(lo), py(la)] as [number, number])),
  })), [trails, origin.lat, origin.lon]);

  const zoom = (f: number, at?: { x: number; y: number }) => setView((v) => {
    fitted.current = false;
    const k = Math.max(fitK * 0.6, Math.min(fitK * 40, v.k * f));
    if (!at) return { ...v, k };
    const wx = v.cx + (at.x - size.w / 2) / v.k, wy = v.cy + (at.y - size.h / 2) / v.k;
    return { k, cx: wx - (at.x - size.w / 2) / k, cy: wy - (at.y - size.h / 2) / k };
  });

  /* ---- gestures ---- */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; pinch: number | null }>({ moved: 0, pinch: null });
  const local = (e: React.PointerEvent | React.WheelEvent) => {
    const r = frame.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 1) gesture.current = { moved: 0, pinch: null };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && gesture.current.pinch) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoom(dist / gesture.current.pinch, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      gesture.current.pinch = dist;
      gesture.current.moved += 10;
      return;
    }
    const dx = p.x - prev.x, dy = p.y - prev.y;
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.current.moved > 4) {
      fitted.current = false;
      setView((v) => ({ ...v, cx: v.cx - dx / v.k, cy: v.cy - dy / v.k }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const p = local(e);
    const wasTap = pointers.current.size === 1 && gesture.current.moved <= 6;
    pointers.current.delete(e.pointerId);
    if (!wasTap) return;
    const wx = view.cx + (p.x - size.w / 2) / view.k, wy = view.cy + (p.y - size.h / 2) / view.k;
    const hit = HIT_PX / view.k;
    const classic = classics.find((c) => Math.hypot(px(c.lon) - wx, py(c.lat) - wy) <= hit);
    if (classic) { onSelectClassic(classic.id); return; }
    let best: { id: string; d: number } | null = null;
    for (const l of lines) for (const [x, y] of l.pts) {
      const d = Math.hypot(x - wx, y - wy);
      if (d <= hit && (!best || d < best.d)) best = { id: l.id, d };
    }
    onSelect(best ? best.id : null);
  };
  const onWheel = (e: React.WheelEvent) => { zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, local(e)); };

  const tx = size.w / 2 - view.cx * view.k, ty = size.h / 2 - view.cy * view.k;
  const ringSteps = radiusMi >= 20 ? [radiusMi / 5, (radiusMi * 2) / 5, radiusMi] : [radiusMi / 2, radiusMi];
  const sel = trails.find((t) => t.id === selected);
  const scr = (lat: number, lon: number) => ({ x: tx + px(lon) * view.k, y: ty + py(lat) * view.k });
  const o = scr(origin.lat, origin.lon);
  const ringLbl = (mi: number) => `${Number.isInteger(mi) ? mi : mi.toFixed(1)} MI`;
  /* scale bar: a round distance about a fifth of the frame */
  const barMi = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50].find((m) => m * view.k >= size.w / 6) ?? 50;

  return (
    <div className="dm-frame" ref={frame}>
      <svg className="dm" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}
        role="img" aria-label={`Map of ${trails.length} trails within ${radiusMi} miles of ${origin.label}. The list below has the same trails.`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={(e) => pointers.current.delete(e.pointerId)} onWheel={onWheel}>
        <rect className="dm-paper" x="0" y="0" width={size.w} height={size.h} />
        <g transform={`translate(${tx} ${ty}) scale(${view.k})`}>
          {ringSteps.map((r) => <circle key={r} cx="0" cy="0" r={r} className="dm-ring" vectorEffect="non-scaling-stroke" />)}
          <line x1={-radiusMi * 1.1} y1="0" x2={radiusMi * 1.1} y2="0" className="dm-tick" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1={-radiusMi * 1.1} x2="0" y2={radiusMi * 1.1} className="dm-tick" vectorEffect="non-scaling-stroke" />
          {lines.map((l) => (
            <path key={l.id} d={l.d} className={"dm-trail" + (l.id === selected ? " on" : "")} vectorEffect="non-scaling-stroke" />
          ))}
          {sel && <path d={lines.find((l) => l.id === sel.id)?.d} className="dm-trail on" vectorEffect="non-scaling-stroke" />}
        </g>
        {ringSteps.map((r) => {
          const p = { x: o.x, y: o.y - r * view.k };
          return p.y > 10 ? <text key={r} x={p.x + 4} y={p.y - 3} className="dm-ring-lbl">{ringLbl(r)}</text> : null;
        })}
        {trails.filter((t) => t.trailhead).map((t) => {
          const p = scr(t.trailhead!.lat, t.trailhead!.lon);
          return <rect key={"th" + t.id} x={p.x - 3} y={p.y - 3} width="6" height="6" className={"dm-th" + (t.id === selected ? " on" : "")} />;
        })}
        {classics.map((c) => {
          const p = scr(c.lat, c.lon);
          return <path key={c.id} d={`M${p.x},${p.y - 7} L${p.x + 6.5},${p.y + 5} L${p.x - 6.5},${p.y + 5} Z`} className="dm-classic" />;
        })}
        {sel && (() => {
          const p = scr(sel.nearest.lat, sel.nearest.lon);
          return <text x={Math.min(size.w - 8, Math.max(8, p.x))} y={Math.max(14, p.y - 10)} className="dm-sel-lbl" textAnchor="middle">{sel.name.toUpperCase()}</text>;
        })()}
        <g transform={`translate(${o.x} ${o.y})`}>
          <path d="M0,-10 L2.9,-3.2 L10,-2.9 L4.4,1.8 L6.2,8.9 L0,4.9 L-6.2,8.9 L-4.4,1.8 L-10,-2.9 L-2.9,-3.2 Z" className="start-star" />
          <text x="13" y="4" className="dm-origin-lbl">{origin.kind === "gps" ? "YOU" : origin.label.toUpperCase().slice(0, 24)}</text>
        </g>
        <g transform={`translate(12 ${size.h - 14})`} aria-hidden="true">
          <path d={`M0,0 L${barMi * view.k},0 M0,-4 L0,0 M${barMi * view.k},-4 L${barMi * view.k},0`} className="dm-bar" />
          <text x="0" y="-7" className="dm-ring-lbl">{barMi} MI</text>
        </g>
        <text x={size.w - 10} y="16" textAnchor="end" className="dm-north" aria-hidden="true">N ↑</text>
      </svg>
      <div className="zoom-ui dm-zoom">
        <button type="button" className="zbtn" onClick={() => zoom(1.5)} aria-label="Zoom in">+</button>
        <button type="button" className="zbtn" onClick={() => zoom(1 / 1.5)} aria-label="Zoom out">−</button>
        <button type="button" className="zbtn" onClick={() => { fitted.current = true; setView({ cx: 0, cy: 0, k: fitK }); }} aria-label="Fit the search area">⌂</button>
      </div>
      {children}
    </div>
  );
}

/* A trail's own shape, tiny: the row plate for a search result. Real geometry, nothing drawn in. */
export function RouteGlyph({ paths, className }: { paths: [number, number][][]; className?: string }) {
  const d = useMemo(() => {
    const pts = paths.flat();
    if (!pts.length) return "";
    const lat0 = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const c = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p[1] * c), ys = pts.map((p) => -p[0]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const sx = (x: number) => 6 + ((x - minX) / span) * 36 + (36 - ((maxX - minX) / span) * 36) / 2;
    const sy = (y: number) => 6 + ((y - minY) / span) * 36 + (36 - ((maxY - minY) / span) * 36) / 2;
    return paths.map((p) => p.map(([la, lo], i) => `${i ? "L" : "M"}${sx(lo * c).toFixed(1)},${sy(-la).toFixed(1)}`).join("")).join("");
  }, [paths]);
  return (
    <svg className={"route-glyph " + (className ?? "")} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" className="rg-frame" />
      <path d={d} className="rg-line" />
    </svg>
  );
}
