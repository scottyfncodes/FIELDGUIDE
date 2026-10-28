/* ---------- TOPO PLATE ----------
   A trail's "portrait" drawn as a contour summit. The shape is seeded from the
   trail id, so it is decoration, not the real terrain. The ring count is data:
   one ring per RING_FT of listed climbing, every fifth ring an index contour,
   the way a USGS quad marks them. A big climb packs the rings tight. */

export const RING_FT = 500;
export const ringsFor = (gain: number) => Math.max(1, Math.round((gain || 0) / RING_FT));

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rng = (seed: number) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* closed Catmull-Rom through the points, as cubic Béziers */
function smooth(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

interface Plate { rings: string[]; summit: [number, number] }
const cache = new Map<string, Plate>();

function build(id: string, n: number): Plate {
  const key = `${id}:${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(hash(id));
  const harm = [2, 3, 5].map((k, i) => ({ k, a: [0.13, 0.08, 0.045][i] * (0.6 + r() * 0.8), ph: r() * Math.PI * 2 }));
  const off: [number, number] = [(r() - 0.5) * 22, (r() - 0.5) * 18];
  const STEPS = 40, R_OUT = 44, R_IN = 7;
  const rings: string[] = [];
  /* even spacing, so a bigger climb is a taller, tighter hill, not just more lines */
  const gap = n > 1 ? Math.min(5.6, (R_OUT - R_IN) / (n - 1)) : 0;
  for (let k = n; k >= 1; k--) {
    const rad = R_OUT - (n - k) * gap;
    const f = (rad - R_IN) / (R_OUT - R_IN);         // 1 = outermost ring
    const cx = 50 + off[0] * (1 - f), cy = 50 + off[1] * (1 - f);
    const wob = 0.45 + 0.55 * f;                     // inner rings are rounder
    const pts: [number, number][] = [];
    for (let s = 0; s < STEPS; s++) {
      const th = (s / STEPS) * Math.PI * 2;
      const m = 1 + harm.reduce((acc, h) => acc + h.a * wob * Math.sin(h.k * th + h.ph), 0);
      pts.push([cx + Math.cos(th) * rad * m, cy + Math.sin(th) * rad * m * 0.86]);
    }
    rings.push(smooth(pts));
  }
  const fIn = n > 1 ? (R_OUT - (n - 1) * gap - R_IN) / (R_OUT - R_IN) : 1;
  const plate = { rings, summit: [50 + off[0] * (1 - fIn), 50 + off[1] * (1 - fIn)] as [number, number] };
  cache.set(key, plate);
  return plate;
}

export function TopoPlate({ id, gain, className, summit, draw }: {
  id: string; gain: number; className?: string; summit?: boolean; draw?: boolean;
}) {
  const n = ringsFor(gain);
  const p = build(id, n);
  return (
    <svg viewBox="0 0 100 100" className={"plate" + (draw ? " plate-draw" : "") + (className ? " " + className : "")}
      aria-hidden="true" focusable="false">
      {p.rings.map((d, i) => {
        const fromTop = n - i; // ring number counted from the bottom of the climb
        return <path key={i} d={d} pathLength={1} className={"plate-ring" + (fromTop % 5 === 0 ? " plate-index" : "")}
          style={{ ["--i" as string]: i }} />;
      })}
      {summit
        ? <path d={`M${p.summit[0]},${p.summit[1] - 5} l4.6,8 h-9.2z`} className="plate-summit" />
        : <circle cx={p.summit[0]} cy={p.summit[1]} r="2.6" className="plate-summit" />}
    </svg>
  );
}
