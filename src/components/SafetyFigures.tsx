import { useState } from "react";
import type { Figure } from "../data/safety/types";

/* ---------- SAFETY DRAWINGS ----------
   SOS's diagrams, redrawn as ink line work on the quad-sheet paper: the same
   geometry and numbered callouts, the app's own colors. Red marks a wound and
   nothing else. All decorative: the steps beside them carry the meaning. */

const Frame = ({ vb = "0 0 300 220", children }: { vb?: string; children: React.ReactNode }) => (
  <svg className="sf-stage" viewBox={vb} aria-hidden="true">{children}</svg>
);
const Limb = ({ tilt }: { tilt?: boolean }) => tilt
  ? <rect className="sf-skin" x="30" y="120" width="240" height="26" rx="13" transform="rotate(-8 150 133)" />
  : <rect className="sf-skin" x="40" y="70" width="220" height="60" rx="30" />;

const BANDAGE = [
  <><Limb /><circle className="sf-wound" cx="150" cy="100" r="16" /></>,
  <><Limb /><rect className="sf-dressing" x="115" y="78" width="70" height="44" rx="8" /><circle className="sf-wound" cx="150" cy="100" r="10" opacity=".5" /><path className="sf-arrow" d="M150 40 v30 M130 45 l20 -20 l20 20" /></>,
  <><Limb /><rect className="sf-dressing" x="110" y="76" width="80" height="48" rx="8" /><path className="sf-wrap" d="M100 68 q50 -14 100 0 M100 132 q50 14 100 0 M95 90 q55 -10 110 0 M95 110 q55 10 110 0" /></>,
  <><Limb /><rect className="sf-wrapped" x="100" y="70" width="100" height="60" rx="10" /><path className="sf-arrow" d="M205 100 h30 M225 92 l10 8 l-10 8" /><path className="sf-arrow" d="M150 40 l0 20 M140 50 l10 -14 l10 14" /></>,
];
const SPLINT = [
  <><Limb tilt /><circle className="sf-wound" cx="150" cy="120" r="10" /></>,
  <><Limb tilt /><rect className="sf-wood" x="35" y="150" width="230" height="14" rx="7" /></>,
  <><Limb tilt /><rect className="sf-wood" x="35" y="150" width="230" height="14" rx="7" />{[55, 150, 235].map((x) => <rect key={x} className="sf-tie" x={x} y="112" width="10" height="55" />)}</>,
  <><Limb tilt /><rect className="sf-wood" x="35" y="150" width="230" height="14" rx="7" />{[55, 150, 235].map((x) => <rect key={x} className="sf-tie" x={x} y="112" width="10" height="55" />)}<path className="sf-arrow sf-dash" d="M270 60 q-40 30 -40 70" /></>,
];

/** SOS's step-through viewer: one drawing and caption at a time, with every step also listed for print. */
export function StepViewer({ id, title, steps }: { id: "bandage" | "splint"; title: string; steps: string[] }) {
  const [i, setI] = useState(0);
  const art = id === "bandage" ? BANDAGE : SPLINT;
  return (
    <section className="sf-viewer" aria-label={title}>
      <h3 className="sf-viewer-hd">{title}</h3>
      <Frame>{art[i]}</Frame>
      <p className="sf-cap" aria-live="polite">{steps[i]}</p>
      <div className="sf-controls">
        <button type="button" className="pa-btn" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>Previous</button>
        <span className="sf-dots" aria-label={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((_, k) => <span key={k} className={k === i ? "on" : ""} />)}
        </span>
        <button type="button" className="pa-btn pa-primary" onClick={() => setI(Math.min(steps.length - 1, i + 1))} disabled={i === steps.length - 1}>Next step</button>
      </div>
      <ol className="sf-print-steps">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
    </section>
  );
}

const DIPPER: Record<string, [number, number]> = { a: [30, 250], b: [70, 225], c: [115, 205], d: [150, 190], e: [160, 232], f: [222, 238], g: [228, 190] };
const seg = (p: [number, number], q: [number, number], k: string) => <line key={k} className="sf-line" x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />;

export function SafetyFigure({ fig }: { fig: Figure }) {
  if (fig === "leanto") return (
    <Frame vb="0 0 300 210">
      <line className="sf-ground" x1="20" y1="190" x2="280" y2="190" />
      <line className="sf-pole" x1="60" y1="190" x2="60" y2="70" />
      <line className="sf-pole" x1="60" y1="70" x2="240" y2="190" />
      <g className="sf-bough"><line x1="80" y1="90" x2="220" y2="185" /><line x1="100" y1="95" x2="220" y2="165" /><line x1="120" y1="100" x2="220" y2="145" /><line x1="140" y1="105" x2="220" y2="125" /><line x1="160" y1="112" x2="215" y2="112" /></g>
      <text className="sf-num" x="45" y="60">1</text><text className="sf-num" x="230" y="207">2</text><text className="sf-num" x="150" y="95">3</text>
    </Frame>
  );
  if (fig === "debris") return (
    <Frame vb="0 0 300 210">
      <line className="sf-ground" x1="20" y1="190" x2="280" y2="190" />
      <path className="sf-pole" d="M40 190 L150 90 L260 190 Z" fill="none" />
      <g className="sf-bough"><line x1="60" y1="185" x2="150" y2="100" /><line x1="90" y1="185" x2="150" y2="108" /><line x1="120" y1="185" x2="150" y2="116" /><line x1="240" y1="185" x2="150" y2="100" /><line x1="210" y1="185" x2="150" y2="108" /><line x1="180" y1="185" x2="150" y2="116" /></g>
      <ellipse className="sf-hollow" cx="150" cy="188" rx="18" ry="10" />
      <text className="sf-num" x="55" y="170">1</text><text className="sf-num" x="150" y="80">2</text><text className="sf-num" x="130" y="207">3</text>
    </Frame>
  );
  if (fig === "shadow") return (
    <Frame>
      <line className="sf-ground" x1="10" y1="190" x2="290" y2="190" />
      <line className="sf-pole" x1="150" y1="190" x2="150" y2="60" />
      <circle className="sf-sun" cx="245" cy="40" r="16" />
      <line className="sf-shadow" x1="150" y1="190" x2="90" y2="192" />
      <circle className="sf-mark" cx="90" cy="192" r="5" /><text className="sf-lbl" x="62" y="212">Mark 1 (W)</text>
      <circle className="sf-mark" cx="205" cy="192" r="5" /><text className="sf-lbl" x="180" y="212">Mark 2 (E)</text>
      <line className="sf-line sf-dash" x1="90" y1="192" x2="205" y2="192" />
    </Frame>
  );
  const p = DIPPER;
  return (
    <Frame vb="0 0 300 260">
      {[seg(p.a, p.b, "ab"), seg(p.b, p.c, "bc"), seg(p.c, p.d, "cd"), seg(p.d, p.e, "de"), seg(p.e, p.f, "ef"), seg(p.f, p.g, "fg"), seg(p.g, p.d, "gd")]}
      {Object.entries(p).map(([k, [x, y]]) => <circle key={k} className="sf-star" cx={x} cy={y} r={"efg".includes(k) ? 6 : 4.5} />)}
      <line className="sf-line sf-dash" x1="228" y1="190" x2="252" y2="40" />
      <circle className="sf-star sf-polaris" cx="252" cy="40" r="7" />
      <text className="sf-lbl" x="170" y="183">pointer stars</text>
      <text className="sf-lbl" x="170" y="28">Polaris (North)</text>
    </Frame>
  );
}
