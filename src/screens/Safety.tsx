import { useEffect, useRef, useState } from "react";
import { ARTICLES, BANDAGE_STEPS, EMERGENCY_NUMBERS, EMERGENCY_ORGS, FIRST_AID_MYTHS, QUICK_REF, SPLINT_STEPS, TRIAGE } from "../data/safety/sos";
import type { ResultNode, TriageNode } from "../data/safety/types";
import { SITUATIONS, articleById, loadSaved, savedLabel, searchSafety, situationLabel, toggleSavedRef, triageNode } from "../lib/safety";
import type { Origin } from "../lib/discover";
import { Tag } from "../components/atlasBits";
import { Blocks, CallBox, MedicalNote, NotDo, SeverityBadge } from "../components/SafetyBits";
import { StepViewer } from "../components/SafetyFigures";
import { HazardPanel } from "../components/HazardPanel";

/* ---------- SAFETY & SURVIVAL ----------
   The SOS Offline Survival Guide's outdoor material, inside the app: triage
   flows, first aid, and the trail skills, all bundled so they open with no
   signal. Live conditions are the one part that needs a connection, and they
   say so. Views are hash params (see lib/safety.ts). */

/** The situations most likely on a trail, offered first; the full list is one tap away. */
const ON_TRAIL = ["bleeding", "fracture", "hypothermia", "heat", "lost", "headspinal", "snakebite", "allergic"];

/** SOS's extended material (home, outages, pandemic, unrest, rebuilding) stays in SOS. */
export const SOS_URL = "https://scottyfncodes.github.io/SOS/";

type Go = (params: Record<string, string>, opts?: { replace?: boolean }) => void;

function useOnline() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  const [offlineReady, setReady] = useState(() => typeof navigator !== "undefined" && !!navigator.serviceWorker?.controller);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    navigator.serviceWorker?.ready?.then(() => setReady(true)).catch(() => {});
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return { online, offlineReady };
}

export function Safety({ params, go, origin }: { params: Record<string, string>; go: Go; origin: Origin | null }) {
  const [saved, setSaved] = useState(loadSaved);
  const toggle = (ref: string) => setSaved(toggleSavedRef(ref));
  const saveBtn = (ref: string) => (
    <button type="button" className={"pa-btn sa-save" + (saved.includes(ref) ? " on" : "")} aria-pressed={saved.includes(ref)} onClick={() => toggle(ref)}>
      {saved.includes(ref) ? "Saved" : "Save"}
    </button>
  );
  const home = () => go({});
  const topRef = useRef<HTMLDivElement>(null);
  const view = params.flow ? `flow:${params.flow}` : params.topic ? `topic:${params.topic}:${params.sec ?? ""}` : "home";
  useEffect(() => {
    if (params.sec) document.getElementById(`sa-sec-${params.sec}`)?.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
    /* land keyboard and screen-reader users on the new view's heading */
    if (view !== "home") topRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }, [view]);

  let body: JSX.Element;
  if (params.flow) body = <Triage refStr={params.flow} go={go} home={home} saveBtn={saveBtn} />;
  else if (params.topic === "firstaid") body = <FirstAid go={go} home={home} saveBtn={saveBtn} />;
  else if (params.topic === "quick") body = <Quick home={home} saveBtn={saveBtn} />;
  else if (params.topic === "live") body = <Live home={home} origin={origin} />;
  else if (params.topic === "contacts") body = <Contacts home={home} />;
  else if (params.topic === "print") body = <PrintAll home={home} />;
  else if (params.topic && articleById(params.topic)) body = <ArticleView id={params.topic} home={home} saveBtn={saveBtn} />;
  else body = <Index go={go} saved={saved} />;

  return <div className="safety" ref={topRef}>{body}</div>;
}

function Back({ onClick, label = "Safety" }: { onClick: () => void; label?: string }) {
  return <button type="button" className="sa-back" onClick={onClick}><span aria-hidden="true">←</span> {label}</button>;
}

function EmergencyPlate({ go }: { go: Go }) {
  return (
    <section className="sos-plate" aria-label="In an emergency">
      <p className="sos-plate-hd">In an emergency</p>
      <div className="sos-plate-actions">
        <a className="call-btn" href="tel:911">Call 911</a>
        <button type="button" className="triage-btn" onClick={() => go({ flow: "entry" })}>Start emergency triage</button>
      </div>
      <p className="sos-plate-note">This guide can't call for help, diagnose an injury or promise anyone's safety. If a life may be at risk, call 911 as soon as you can.</p>
    </section>
  );
}

/* ================= INDEX ================= */
function Index({ go, saved }: { go: Go; saved: string[] }) {
  const [q, setQ] = useState("");
  const hits = searchSafety(q);
  const { online, offlineReady } = useOnline();
  const routeOf = (ref: string) => { const [k, id] = ref.split(":"); return { [k]: id }; };
  return (
    <div className="screen sa-index">
      <p className="screen-eyebrow">General reference · works offline</p>
      <h2 className="screen-title">Safety &amp; Survival</h2>
      <p className={"sa-status" + (online ? "" : " off")} role="status">
        {!online ? "You're offline. Everything here except live conditions still works."
          : offlineReady ? "Saved on this phone: the guide opens with no signal."
          : "Open the app once with signal and it saves itself for use with no signal."}
      </p>

      <EmergencyPlate go={go} />

      <div className="sa-search">
        <label className="sr-only" htmlFor="sa-q">Search safety and survival</label>
        <input id="sa-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
          placeholder="Search: bleeding, lightning, lost, water…" />
      </div>
      {q.trim() && (
        <div className="sa-hits" aria-label="Search results">
          {hits.length ? hits.map((h) => (
            <button key={h.title + JSON.stringify(h.route)} type="button" className="sa-row" onClick={() => go(h.route)}>
              <span className="sa-row-where">{h.where}</span>
              <span className="sa-row-title">{h.title}</span>
            </button>
          )) : <p className="quiet">Nothing matches "{q.trim()}". Try a simpler word, or start emergency triage above.</p>}
        </div>
      )}

      {saved.length > 0 && (
        <section className="sa-group" aria-label="Saved">
          <h3 className="sa-group-hd">Saved</h3>
          {saved.map((ref) => {
            const label = savedLabel(ref);
            return label && <button key={ref} type="button" className="sa-row" onClick={() => go(routeOf(ref))}><span className="sa-row-title">{label}</span></button>;
          })}
        </section>
      )}

      <section className="sa-group" aria-label="Common on the trail">
        <h3 className="sa-group-hd">Common on the trail</h3>
        <div className="sa-situations">
          {ON_TRAIL.map((f) => <button key={f} type="button" className="sa-sit" onClick={() => go({ flow: f })}>{situationLabel(f)}</button>)}
        </div>
        <button type="button" className="linkish sa-more" onClick={() => go({ flow: "entry" })}>All {SITUATIONS.length} situations</button>
      </section>

      <section className="sa-group" aria-label="Reference">
        <h3 className="sa-group-hd">Reference</h3>
        <button type="button" className="sa-row" onClick={() => go({ topic: "firstaid" })}>
          <span className="sa-row-title">First Aid</span>
          <span className="sa-row-blurb">Tap-through triage, pressure bandaging, splinting, and common myths.</span>
        </button>
        {ARTICLES.map((a) => (
          <button key={a.id} type="button" className="sa-row" onClick={() => go({ topic: a.id })}>
            <span className="sa-row-title">{a.title}</span>
            <span className="sa-row-blurb">{a.blurb}</span>
          </button>
        ))}
        <button type="button" className="sa-row" onClick={() => go({ topic: "quick" })}>
          <span className="sa-row-title">Quick Reference</span>
          <span className="sa-row-blurb">The ten most critical facts on one screen.</span>
        </button>
      </section>

      <section className="sa-group" aria-label="Live and contacts">
        <h3 className="sa-group-hd">Conditions &amp; contacts</h3>
        <button type="button" className="sa-row" onClick={() => go({ topic: "live" })}>
          <span className="sa-row-title">Live conditions <span className="hz-net">needs signal</span></span>
          <span className="sa-row-blurb">Weather alerts, air quality, nearby help and earthquakes, when you ask.</span>
        </button>
        <button type="button" className="sa-row" onClick={() => go({ topic: "contacts" })}>
          <span className="sa-row-title">Emergency contacts</span>
          <span className="sa-row-blurb">Numbers by region and relief organizations. Works offline.</span>
        </button>
      </section>

      <div className="sa-foot">
        <button type="button" className="pa-btn" onClick={() => go({ topic: "print" })}>Print or save the guide as a PDF</button>
        <p className="quiet small">
          Adapted from the <a href={SOS_URL} target="_blank" rel="noreferrer">SOS Offline Survival Guide</a>, which also
          covers home preparedness, power outages, pandemics, civil unrest and rebuilding. That extended library stays there.
        </p>
      </div>
    </div>
  );
}

/* ================= ARTICLE ================= */
function ArticleView({ id, home, saveBtn }: { id: string; home: () => void; saveBtn: (r: string) => JSX.Element }) {
  const a = articleById(id)!;
  return (
    <article className="screen sa-article">
      <div className="sa-bar"><Back onClick={home} />{saveBtn(`topic:${id}`)}</div>
      <p className="screen-eyebrow">Safety &amp; Survival <Tag p="general" /></p>
      <h2 className="sa-title" tabIndex={-1}>{a.title}</h2>
      <p className="sa-general">General guidance, not specific to any trail or place. For conditions where you are, use Live conditions.</p>
      {id === "signal" && <p className="sa-flash-warn">The screen strobe below flashes rapidly. Skip it if you're sensitive to flashing light.</p>}
      {a.sections.map((s, i) => (
        <section key={s.title} id={`sa-sec-${i}`} className="sa-sec">
          {(i > 0 || a.sections.length > 1) && <h3>{s.title}</h3>}
          <Blocks blocks={s.blocks} />
        </section>
      ))}
    </article>
  );
}

/* ================= FIRST AID ================= */
function FirstAid({ go, home, saveBtn }: { go: Go; home: () => void; saveBtn: (r: string) => JSX.Element }) {
  return (
    <article className="screen sa-article">
      <div className="sa-bar"><Back onClick={home} />{saveBtn("topic:firstaid")}</div>
      <p className="screen-eyebrow">Safety &amp; Survival <Tag p="general" /></p>
      <h2 className="sa-title" tabIndex={-1}>First Aid</h2>
      <MedicalNote />
      <button type="button" className="triage-btn wide" onClick={() => go({ flow: "entry" })}>Start triage<small>Tap-through decision flow</small></button>
      <div className="sev-legend" aria-label="What the levels mean">
        <SeverityBadge s="mild" /><SeverityBadge s="moderate" /><SeverityBadge s="severe" />
      </div>
      <section className="sa-sec">
        <h3>Jump straight to a situation</h3>
        <div className="sa-situations">
          {SITUATIONS.map((s) => <button key={s.flow} type="button" className="sa-sit" onClick={() => go({ flow: s.flow })}>{s.label}</button>)}
        </div>
      </section>
      <section className="sa-sec"><StepViewer id="bandage" title="Step-through: Pressure Bandaging" steps={BANDAGE_STEPS} /></section>
      <section className="sa-sec"><StepViewer id="splint" title="Step-through: Basic Splinting" steps={SPLINT_STEPS} /></section>
      <section className="sa-sec">
        <h3>Common Myths</h3>
        <NotDo items={FIRST_AID_MYTHS} />
      </section>
    </article>
  );
}

/* ================= TRIAGE ================= */
function Triage({ refStr, go, home, saveBtn }: { refStr: string; go: Go; home: () => void; saveBtn: (r: string) => JSX.Element }) {
  const hit = triageNode(refStr);
  if (!hit) return (
    <div className="screen"><Back onClick={home} /><h2 className="sa-title" tabIndex={-1}>Not found</h2><p>That step isn't in the guide. Start triage again.</p>
      <button type="button" className="triage-btn" onClick={() => go({ flow: "entry" })}>Start triage</button></div>
  );
  const { flow, node, n } = hit;
  const isEntry = flow === "entry";
  return (
    <article className="screen sa-triage">
      <div className="sa-bar">
        <Back onClick={() => (isEntry ? home() : go({ flow: "entry" }))} label={isEntry ? "Safety" : "All situations"} />
        {!isEntry && saveBtn(`flow:${flow}`)}
      </div>
      <p className="screen-eyebrow">{isEntry ? "Emergency triage" : situationLabel(flow)}</p>
      <TriageBody flow={flow} node={node} n={n} go={go} />
    </article>
  );
}

function TriageBody({ flow, node, n, go }: { flow: string; node: string; n: TriageNode; go: Go }) {
  if (n.type === "menu") return (
    <>
      <h2 className="sa-title" tabIndex={-1}>{n.title}</h2>
      <p className="quiet">{flow === "entry" ? "Tap the situation that matches. Each leads to a short set of yes/no questions." : "Choose the one that fits."}</p>
      <div className="tri-options">
        {n.items.map((i) => <button key={i.go} type="button" className="tri-opt" onClick={() => go({ flow: i.go.endsWith(":start") ? i.go.slice(0, -6) : i.go })}>{i.label}</button>)}
      </div>
      {flow === "entry" && <MedicalNote />}
    </>
  );
  if (n.type === "q") return (
    <>
      <p className="tri-q-lbl">Question</p>
      <h2 className="sa-title tri-q" tabIndex={-1}>{n.text}</h2>
      <div className="tri-options">
        {n.options.map((o) => <button key={o.label} type="button" className="tri-opt" onClick={() => go({ flow: `${o.flow ?? flow}:${o.next}` })}>{o.label}<span aria-hidden="true">→</span></button>)}
      </div>
    </>
  );
  return <TriageResult flow={flow} node={node} n={n} go={go} />;
}

function TriageResult({ flow, n, go }: { flow: string; node: string; n: ResultNode; go: Go }) {
  return (
    <>
      <div className={"tri-result sevb-" + n.severity}>
        <SeverityBadge s={n.severity} />
        <h2 className="sa-title" tabIndex={-1}>{n.title}</h2>
        <CallBox node={n} />
        <ol className="sa-steps big">{n.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </div>
      <NotDo items={n.notdo} />
      {n.severity === "severe" && <button type="button" className="pa-btn sa-find" onClick={() => go({ topic: "live" })}>Find nearby hospitals (needs signal)</button>}
      <div className="id-actions">
        <button type="button" className="pa-btn" onClick={() => go({ flow })}>Start this flow over</button>
        <button type="button" className="pa-btn" onClick={() => go({ flow: "entry" })}>Choose a different situation</button>
      </div>
      <MedicalNote />
    </>
  );
}

/* ================= QUICK, LIVE, CONTACTS ================= */
function Quick({ home, saveBtn }: { home: () => void; saveBtn: (r: string) => JSX.Element }) {
  return (
    <article className="screen sa-article">
      <div className="sa-bar"><Back onClick={home} />{saveBtn("topic:quick")}</div>
      <p className="screen-eyebrow">Safety &amp; Survival <Tag p="general" /></p>
      <h2 className="sa-title" tabIndex={-1}>Quick Reference</h2>
      <QuickList />
    </article>
  );
}
const QuickList = () => <dl className="sa-quick">{QUICK_REF.map((q) => <div key={q.t}><dt>{q.t}</dt><dd>{q.d}</dd></div>)}</dl>;

function Live({ home, origin }: { home: () => void; origin: Origin | null }) {
  return (
    <div className="screen sa-article">
      <div className="sa-bar"><Back onClick={home} /></div>
      <p className="screen-eyebrow">Official and live sources</p>
      <h2 className="sa-title" tabIndex={-1}>Live conditions</h2>
      <p className="sa-general">For today's forecast at each trailhead, use the forecast on Explore and on trail pages. These checks add what the forecast doesn't: active warnings, smoke, help nearby and recent earthquakes.</p>
      <HazardPanel kinds={["alerts", "air", "facilities", "quakes"]} origin={origin ? { lat: origin.lat, lon: origin.lon, label: origin.label } : null} title="Check a point" />
    </div>
  );
}

function ContactsBody() {
  return (
    <>
      <h3>Emergency numbers by region</h3>
      <p className="quiet small">A static reference, not a live lookup.</p>
      <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th scope="col">Region</th><th scope="col">Number</th></tr></thead>
        <tbody>{EMERGENCY_NUMBERS.map((e) => <tr key={e.region}><th scope="row">{e.region}</th><td className="mono">{e.num}</td></tr>)}</tbody></table></div>
      <p>On many mobile phones, dialing <b>112</b> reaches local emergency services as a built-in carrier failsafe, even in regions where it is not the primary number. This list is not exhaustive and numbers can change - verify locally when you have signal.</p>
      <h3>Relief organizations</h3>
      <dl className="sa-quick">{EMERGENCY_ORGS.map((o) => <div key={o.name}><dt>{o.name}</dt><dd><span className="mono">{o.contact}</span><br />{o.note}</dd></div>)}</dl>
    </>
  );
}
function Contacts({ home }: { home: () => void }) {
  return (
    <div className="screen sa-article">
      <div className="sa-bar"><Back onClick={home} /></div>
      <p className="screen-eyebrow">Works offline <Tag p="general" /></p>
      <h2 className="sa-title" tabIndex={-1}>Emergency contacts</h2>
      <ContactsBody />
    </div>
  );
}

/* ================= PRINT ================= */
function flatFlow(id: string) {
  const flow = TRIAGE[id];
  return Object.entries(flow).map(([nid, n]) => {
    if (n.type === "q") return (
      <div key={nid} className="pr-q"><p><b>Q: {n.text}</b></p>
        <ul>{n.options.map((o) => { const t = TRIAGE[o.flow ?? id]?.[o.next]; return <li key={o.label}>{o.label} → {t ? ("title" in t ? t.title : "text" in t ? t.text : o.next) : o.next}</li>; })}</ul></div>
    );
    if (n.type === "menu") return <div key={nid} className="pr-q"><p><b>{n.title}</b></p><ul>{n.items.map((i) => <li key={i.go}>{i.label}</li>)}</ul></div>;
    return (
      <div key={nid} className={"tri-result sevb-" + n.severity}>
        <SeverityBadge s={n.severity} /><h4>{n.title}</h4>
        <ol className="sa-steps">{n.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <NotDo items={n.notdo} />
      </div>
    );
  });
}

function PrintAll({ home }: { home: () => void }) {
  return (
    <div className="screen sa-print">
      <div className="sa-bar no-print"><Back onClick={home} /></div>
      <h2 className="sa-title" tabIndex={-1}>Safety &amp; Survival: full guide</h2>
      <p className="no-print">Every outdoor section on one page. Use Print, then choose Save as PDF, or save the PDF from the print preview's share button on iPhone. A printed copy in a waterproof bag keeps working when the battery doesn't.</p>
      <button type="button" className="pa-btn pa-primary no-print" onClick={() => window.print()}>Print or save as PDF</button>
      <p className="pr-head">Field Guide · Safety &amp; Survival · printed {new Date().toLocaleDateString()}. In an emergency call 911 (US and Canada). General reference adapted from the SOS Offline Survival Guide; not reviewed by a medical professional and not a substitute for trained care.</p>
      <section className="sa-sec"><h3>Quick Reference</h3><QuickList /></section>
      <section className="sa-sec">
        <h3>Emergency triage (all flows)</h3>
        <p>Each flow below starts at its first question. Follow the arrow for the answer that fits.</p>
        {SITUATIONS.map((s) => <div key={s.flow} className="pr-flow"><h4 className="pr-flow-hd">{s.label}</h4>{flatFlow(s.flow)}</div>)}
      </section>
      <section className="sa-sec">
        <h3>Pressure bandaging</h3><ol className="sa-steps">{BANDAGE_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
        <h3>Basic splinting</h3><ol className="sa-steps">{SPLINT_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
        <h3>Common myths</h3><NotDo items={FIRST_AID_MYTHS} />
      </section>
      {ARTICLES.map((a) => (
        <section key={a.id} className="sa-sec pr-article">
          <h3>{a.title}</h3>
          {a.sections.map((s) => <div key={s.title}>{a.sections.length > 1 && <h4>{s.title}</h4>}<Blocks blocks={s.blocks.filter((b) => b.t !== "strobe")} /></div>)}
        </section>
      ))}
      <section className="sa-sec"><h3>Emergency contacts</h3><ContactsBody /></section>
    </div>
  );
}
