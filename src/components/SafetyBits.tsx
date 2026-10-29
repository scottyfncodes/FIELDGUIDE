import { useEffect, useRef, useState } from "react";
import type { Block, ResultNode, Severity } from "../data/safety/types";
import { needsCall } from "../lib/safety";
import { SafetyFigure } from "./SafetyFigures";

/* ---------- SAFETY BUILDING BLOCKS ---------- */

const SEV_TEXT: Record<Severity, string> = { mild: "Mild", moderate: "Moderate", severe: "Severe", info: "Info" };
const SEV_MEANS: Record<Severity, string> = {
  mild: "manage it yourself",
  moderate: "get care promptly",
  severe: "emergency",
  info: "",
};
export function SeverityBadge({ s }: { s: Severity }) {
  return <span className={"sev sev-" + s}>{SEV_TEXT[s]}{SEV_MEANS[s] && <small> · {SEV_MEANS[s]}</small>}</span>;
}

/* SOS's rule, kept: severe results (and the "not sure" result) get a call button;
   moderate ones a nudge to get care. 911 is the number in Colorado. */
export function CallBox({ node }: { node: ResultNode }) {
  if (needsCall(node)) return (
    <div className="call-box">
      <a className="call-btn" href="tel:911">Call 911 now</a>
      <p>911 is the US and Canada number. Elsewhere, see Emergency contacts on the Safety page for your local number.</p>
    </div>
  );
  if (node.severity === "moderate") return <p className="care-note">Get medical care as soon as you reasonably can.</p>;
  return null;
}

/** Shown wherever first-aid steps appear. */
export function MedicalNote() {
  return (
    <p className="med-note">
      General first-aid reference, adapted from the SOS Offline Survival Guide. It can't diagnose an injury,
      call for help or replace trained care, and it hasn't yet been reviewed by a medical professional.
    </p>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((b, i) => <BlockView key={i} b={b} />)}</>;
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "h": return <h4 className="sa-h">{b.text}</h4>;
    case "p":
      if ("text" in b) return /^[·–\s]+$/.test(b.text) ? <p className="sa-morse" aria-label="dot dot dot, dash dash dash, dot dot dot">{b.text}</p> : <p>{b.text}</p>;
      return <p>{b.runs.map((r, i) => (typeof r === "string" ? r : <b key={i}>{r.b}</b>))}</p>;
    case "steps": return <ol className="sa-steps">{b.items.map((s) => <li key={s}>{s}</li>)}</ol>;
    case "list": return <ul className="ticks">{b.items.map((s, i) => <li key={i}>{typeof s === "string" ? s : <><b>{s.lead}</b> {s.text}</>}</li>)}</ul>;
    case "warn": return <NotDo title={b.title} items={b.items} />;
    case "table": return (
      <div className="sa-table-wrap">
        <table className="sa-table">
          <thead><tr>{b.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{b.rows.map((r) => <tr key={r.join("|")}>{r.map((c, i) => i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    case "figure": return <figure className="sa-fig"><SafetyFigure fig={b.fig} /></figure>;
    case "strobe": return <Strobe />;
  }
}

export function NotDo({ title = "What NOT to do", items }: { title?: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="notdo">
      <h4>{title}</h4>
      <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}

/* ---------- screen strobe: SOS's timings, a STOP button that never leaves the screen ---------- */
function sosSequence(unit: number): [number, boolean][] {
  const seq: [number, boolean][] = [];
  const dot = () => { seq.push([unit, true], [unit, false]); };
  const dash = () => { seq.push([unit * 3, true], [unit, false]); };
  dot(); dot(); dot(); seq[seq.length - 1][0] = unit * 3;
  dash(); dash(); dash(); seq[seq.length - 1][0] = unit * 3;
  dot(); dot(); dot(); seq[seq.length - 1][0] = unit * 7;
  return seq;
}

export function Strobe() {
  const [mode, setMode] = useState<"strobe" | "sos" | null>(null);
  const [on, setOn] = useState(true);
  const stopRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mode) return;
    let alive = true, t = 0;
    if (mode === "strobe") {
      let lit = true;
      const tick = () => { if (!alive) return; setOn(lit); lit = !lit; t = window.setTimeout(tick, 300); };
      tick();
    } else {
      const seq = sosSequence(200);
      let i = 0;
      const tick = () => { if (!alive) return; const [ms, lit] = seq[i % seq.length]; setOn(lit); i++; t = window.setTimeout(tick, ms); };
      tick();
    }
    stopRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMode(null); };
    window.addEventListener("keydown", onKey);
    return () => { alive = false; window.clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [mode]);

  const start = (m: "strobe" | "sos") => { opener.current = document.activeElement as HTMLElement | null; setMode(m); };
  const stop = () => { setMode(null); requestAnimationFrame(() => opener.current?.focus()); };

  return (
    <div className="strobe">
      <div className="id-actions">
        <button type="button" className="pa-btn pa-primary" onClick={() => start("strobe")}>Steady strobe</button>
        <button type="button" className="pa-btn pa-primary" onClick={() => start("sos")}>SOS pattern</button>
      </div>
      {mode && (
        <div className="strobe-overlay" role="alertdialog" aria-label="Screen strobe running" style={{ background: on ? "#fff" : "#000" }}>
          <button ref={stopRef} type="button" className="strobe-stop" onClick={stop}>STOP</button>
        </div>
      )}
    </div>
  );
}
