import { useMemo, useRef, useState } from "react";
import type { Log } from "../data/types";
import { GROUP_LABEL, SPECIES } from "../data/species";
import type { Group } from "../data/species";
import { activeOuting, collection, endOuting, getAtlas, observationsOn, replaceAtlas, useAtlas } from "../lib/atlas";
import type { AtlasData } from "../lib/atlas";
import { KIND_LABEL, PLACES, placeByRef } from "../lib/places";
import { detectSource, importLeafHunter, importLookup } from "../lib/importers";
import { processImage, putPhoto } from "../lib/photos";
import { TRAILS } from "../data/trails";
import { ObsRow, useActions } from "../components/PlaceSections";
import { SpeciesArt, fmtDate, fmtDuration } from "../components/atlasBits";
import { LeafGlyph } from "../components/Glyphs";

type View = "species" | "places" | "outings" | "journal";
const VIEWS: { key: View; label: string }[] = [
  { key: "species", label: "Species" },
  { key: "places", label: "Places" },
  { key: "outings", label: "Outings" },
  { key: "journal", label: "Journal" },
];

export function Atlas({ log }: { log: Log }) {
  const d = useAtlas();
  const act = useActions();
  const [view, setView] = useState<View>("species");
  const col = useMemo(() => collection(d), [d]);
  const found = new Set(col.map((e) => e.speciesId));
  const hiked = TRAILS.filter((t) => log[t.id]?.done).length;
  const out = activeOuting(d);
  const empty = !d.observations.length && !d.outings.length && !d.saved.length;

  return (
    <div className="screen atlas">
      <header className="atlas-hd">
        <p className="screen-eyebrow" aria-hidden="true">No. 3 · The collection</p>
        <h2 className="screen-title">My Atlas</h2>
        <dl className="tally-row">
          <div><dt>Species</dt><dd>{found.size}<small>/{SPECIES.length}</small></dd></div>
          <div><dt>Finds</dt><dd>{d.observations.filter((o) => o.kind === "find").length}</dd></div>
          <div><dt>Outings</dt><dd>{d.outings.length}</dd></div>
          <div><dt>Trails hiked</dt><dd>{hiked}<small>/{TRAILS.length}</small></dd></div>
        </dl>
        <div className="progress" role="progressbar" aria-label="Field guide species found" aria-valuemin={0} aria-valuemax={SPECIES.length} aria-valuenow={found.size}>
          <span style={{ width: `${(found.size / SPECIES.length) * 100}%` }} />
        </div>
      </header>

      {out && (
        <div className="outing-now">
          <div>
            <div className="det-eyebrow">ON AN OUTING · {fmtDuration(out.startedAt, null).toUpperCase()}</div>
            <b>{placeByRef(out.placeRef)?.name ?? "Somewhere new"}</b>
            <span className="quiet small"> · {observationsOn(d, out.id).length} find{observationsOn(d, out.id).length === 1 ? "" : "s"} so far</span>
          </div>
          <button type="button" className="pa-btn" onClick={() => {
            const ref = out.placeRef; endOuting(out.id); act.onOutingEnded(ref, !!ref?.startsWith("trail:") && !log[ref.slice(6)]?.done);
          }}>End</button>
        </div>
      )}

      {empty ? (
        <div className="journal-empty">
          <LeafGlyph shape="rounded" className="je-glyph" />
          <h3>Your atlas starts on the trail</h3>
          <p>Every leaf, flower and place you log lands here, tied to where and when you found it. It gets more interesting with every outing.</p>
          <div className="id-actions">
            <button type="button" className="pa-btn pa-primary" onClick={() => act.identifyAt(null)}>Identify a plant</button>
            <button type="button" className="pa-btn" onClick={act.openGuide}>Browse the field guide</button>
          </div>
        </div>
      ) : (
        <>
          <div className="layers" role="tablist" aria-label="Browse by">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" role="tab" aria-selected={view === v.key}
                className={"layer-tab" + (view === v.key ? " on" : "")} onClick={() => setView(v.key)}>{v.label}</button>
            ))}
          </div>
          {view === "species" && <SpeciesView found={found} d={d} />}
          {view === "places" && <PlacesView d={d} log={log} />}
          {view === "outings" && <OutingsView d={d} />}
          {view === "journal" && <JournalView d={d} />}
        </>
      )}

      <DataPanel />
    </div>
  );
}

function SpeciesView({ found, d }: { found: Set<string>; d: AtlasData }) {
  const act = useActions();
  const col = collection(d);
  const byId = new Map(col.map((e) => [e.speciesId, e]));
  const groups: Group[] = ["broadleaf", "conifer", "flower"];
  return (
    <div className="cards-wrap">
      {groups.map((g) => {
        const list = SPECIES.filter((s) => s.groups[0] === g);
        const n = list.filter((s) => found.has(s.id)).length;
        return (
          <section key={g} className="card-group" aria-label={GROUP_LABEL[g]}>
            <h3 className="group-hd"><span className="group-name">{GROUP_LABEL[g]}</span><span className="group-drive">{n} of {list.length}</span></h3>
            <ul className="cards">
              {list.map((s) => {
                const e = byId.get(s.id);
                const thumb = e?.obs.find((o) => o.thumb)?.thumb ?? null;
                return (
                  <li key={s.id}>
                    <button type="button" className={"card" + (e ? " card-found" : "")} onClick={() => act.openSpecies(s.id)}
                      aria-label={`${s.common}${e ? `, found ${e.count} time${e.count === 1 ? "" : "s"}` : ", not found yet"}`}>
                      <SpeciesArt s={s} thumb={thumb} className="card-art" />
                      <span className="card-name">{s.common}</span>
                      <span className="card-meta">{e ? `${e.count}× · since ${fmtDate(e.first, { month: "short", year: "numeric" })}` : "not yet"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {d.observations.some((o) => o.kind === "find" && !o.speciesId) && (
        <section className="card-group">
          <h3 className="group-hd"><span className="group-name">Waiting for a name</span></h3>
          <ul className="obs-list">{d.observations.filter((o) => o.kind === "find" && !o.speciesId).map((o) => <ObsRow key={o.id} o={o} />)}</ul>
        </section>
      )}
    </div>
  );
}

function PlacesView({ d, log }: { d: AtlasData; log: Log }) {
  const act = useActions();
  const refs = new Set<string>([...d.saved.map((s) => s.ref), ...d.observations.map((o) => o.placeRef ?? ""), ...d.outings.map((o) => o.placeRef ?? "")]);
  TRAILS.forEach((t) => { if (log[t.id]?.done) refs.add(`trail:${t.id}`); });
  const places = PLACES.filter((p) => refs.has(p.ref));
  if (!places.length) return <p className="quiet pad">Save a trail or log a find somewhere and it shows up here.</p>;
  return (
    <ul className="rows rows-flat">
      {places.map((p) => {
        const finds = d.observations.filter((o) => o.placeRef === p.ref).length;
        const saved = d.saved.some((s) => s.ref === p.ref);
        const done = p.kind === "trail" && log[p.id]?.done;
        return (
          <li key={p.ref} className="row">
            <button type="button" className="row-main" onClick={() => act.openPlace(p.ref)}>
              <span className="row-top"><span className="row-name">{p.name}</span>{done && <span className="chip chip-good">Hiked</span>}</span>
              <span className="row-where">{KIND_LABEL[p.kind]} · {p.sub}</span>
              <span className="row-meta">{finds} find{finds === 1 ? "" : "s"}{saved ? " · saved" : ""}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function OutingsView({ d }: { d: AtlasData }) {
  const act = useActions();
  if (!d.outings.length) return <p className="quiet pad">Start an outing from any trail or place page. Finds you log while it's running are filed under it.</p>;
  return (
    <ul className="rows rows-flat">
      {d.outings.map((o) => {
        const obs = observationsOn(d, o.id);
        return (
          <li key={o.id} className="row">
            <button type="button" className="row-main" onClick={() => act.openOuting(o.id)}>
              <span className="row-top"><span className="row-name">{placeByRef(o.placeRef)?.name ?? "Outing"}</span>{!o.endedAt && <span className="chip chip-good">Now</span>}</span>
              <span className="row-where">{fmtDate(o.startedAt, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {fmtDuration(o.startedAt, o.endedAt)}</span>
              <span className="row-meta">
                {obs.length} find{obs.length === 1 ? "" : "s"}
                {obs.filter((x) => x.thumb).slice(0, 4).map((x) => <img key={x.id} className="mini-thumb" src={x.thumb!} alt="" />)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function JournalView({ d }: { d: AtlasData }) {
  const byMonth = new Map<string, typeof d.observations>();
  [...d.observations].sort((a, b) => b.observedAt.localeCompare(a.observedAt)).forEach((o) => {
    const k = fmtDate(o.observedAt, { month: "long", year: "numeric" });
    byMonth.set(k, [...(byMonth.get(k) ?? []), o]);
  });
  if (!byMonth.size) return <p className="quiet pad">No finds yet.</p>;
  return (
    <div>
      {[...byMonth.entries()].map(([m, obs]) => (
        <section key={m} className="card-group" aria-label={m}>
          <h3 className="group-hd"><span className="group-name">{m}</span><span className="group-drive">{obs.length}</span></h3>
          <ul className="obs-list">{obs.map((o) => <ObsRow key={o.id} o={o} />)}</ul>
        </section>
      ))}
    </div>
  );
}

/* ---- backup, and bringing data over from Leaf Hunter / LOOKUP ---- */
function DataPanel() {
  const act = useActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ app: "co-field-atlas", exportedAt: new Date().toISOString(), ...getAtlas() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `field-atlas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    let raw: unknown;
    try { raw = JSON.parse(await f.text()); } catch { setMsg("That file isn't valid JSON."); return; }
    const src = detectSource(raw);
    const cur = getAtlas();
    if (src === "leaf-hunter" || src === "lookup") {
      const r = src === "leaf-hunter" ? importLeafHunter(cur, raw) : importLookup(cur, raw);
      for (const p of r.photos) {
        try {
          const pr = await processImage(p.dataUrl);
          await putPhoto(`photo-${p.obsId}`, pr.blob);
          const o = r.data.observations.find((x) => x.id === p.obsId);
          if (o) o.thumb = pr.thumb;
        } catch { /* photo unreadable: keep the record without it */ }
      }
      replaceAtlas(r.data);
      const bits = [`${r.added.observations} find${r.added.observations === 1 ? "" : "s"}`, `${r.added.saved} saved place${r.added.saved === 1 ? "" : "s"}`];
      const skipped = r.skipped.duplicates + r.skipped.unknownPlaces;
      setMsg(`Imported from ${src === "leaf-hunter" ? "Leaf Hunter" : "LOOKUP"}: ${bits.join(", ")}.${skipped ? ` Skipped ${skipped} already here or unknown.` : ""}${r.skipped.unsupported.length ? ` Not brought over: ${r.skipped.unsupported.join("; ")}.` : ""}`);
    } else if (src === "atlas") {
      /* a backup from this app: merge by id, never overwrite */
      const b = raw as AtlasData;
      const ids = new Set(cur.observations.map((o) => o.id));
      const oids = new Set(cur.outings.map((o) => o.id));
      const sref = new Set(cur.saved.map((s) => s.ref));
      const next = {
        ...cur,
        observations: [...cur.observations, ...(b.observations ?? []).filter((o) => !ids.has(o.id))],
        outings: [...cur.outings, ...(b.outings ?? []).filter((o) => !oids.has(o.id))],
        saved: [...cur.saved, ...(b.saved ?? []).filter((s) => !sref.has(s.ref))],
      };
      replaceAtlas(next);
      setMsg(`Restored ${next.observations.length - cur.observations.length} finds and ${next.outings.length - cur.outings.length} outings from the backup. Full-size photos aren't in backups; thumbnails are.`);
    } else {
      setMsg("Didn't recognise that file. Use an export from Leaf Hunter, LOOKUP or this atlas.");
    }
    act.toast("Import finished");
  };

  return (
    <section className="det-sec data-panel" aria-label="Your data">
      <h3>Your data</h3>
      <p className="quiet small">Everything is stored on this device only. Back it up, or bring in what you saved in Leaf Hunter or LOOKUP (export it there first).</p>
      <div className="id-actions">
        <button type="button" className="pa-btn" onClick={exportAll}>Export backup</button>
        <button type="button" className="pa-btn" onClick={() => fileRef.current?.click()}>Import a file</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {msg && <p className="quiet small" role="status">{msg}</p>}
    </section>
  );
}

