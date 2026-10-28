import { useEffect, useMemo, useState } from "react";
import { SPECIES, speciesById } from "../data/species";
import type { Group } from "../data/species";
import { GROUP_CHOICES, QUESTIONS, STRENGTH_TEXT, rankMatches, shortlist } from "../lib/identify";
import type { Answers, Match } from "../lib/identify";
import { activeOuting, addObservation, newId, useAtlas } from "../lib/atlas";
import { PLACES, KIND_LABEL, nearestPlaces, placeByRef } from "../lib/places";
import type { PlaceRef } from "../lib/places";
import { photosPersist, processImage, putPhoto } from "../lib/photos";
import { currentMonth } from "../lib/season";
import { CameraMark, LeafGlyph } from "../components/Glyphs";
import { SpeciesArt, Tag } from "../components/atlasBits";
import { useActions } from "../components/PlaceSections";

type Step = "start" | "key" | "results" | "save";
interface Shot { blob: Blob; thumb: string }

export function Identify({ at, onDone }: { at: PlaceRef | null; onDone: () => void }) {
  const act = useActions();
  const atlas = useAtlas();
  const out = activeOuting(atlas);
  const month = currentMonth();
  const [step, setStep] = useState<Step>("start");
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const matches = useMemo(() => (group ? rankMatches(group, answers, month) : []), [group, answers, month]);
  const short = shortlist(matches);
  const answered = Object.keys(answers).length;

  const reset = () => {
    setStep("start"); setShot(null); setGroup(null); setAnswers({}); setChosen(null); setErr(null); setPicking(false);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.type && !f.type.startsWith("image/")) { setErr("That file isn't a photo."); return; }
    setBusy(true); setErr(null);
    try {
      const p = await processImage(f);
      setShot({ blob: p.blob, thumb: p.thumb });
      setStep("key");
    } catch {
      setErr("Couldn't read that photo. Try taking it again, or pick one from your library.");
    } finally {
      setBusy(false);
    }
  };

  const answer = (q: string, v: string) => setAnswers((a) => {
    const next = { ...a };
    if (next[q] === v) delete next[q]; else next[q] = v;
    return next;
  });

  return (
    <div className="screen identify">
      {step === "start" && (
        <section className="id-start">
          <p className="screen-eyebrow" aria-hidden="true">No. 2 · A field key</p>
          <h2 className="screen-title">What did you find?</h2>
          <p className="screen-lede">Take a photo of the leaf, needles or flower, then answer a few quick questions. The field guide suggests what it might be.</p>
          {out && <p className="context-line">Saving to your outing at <b>{placeByRef(out.placeRef)?.name ?? "an unnamed place"}</b>.</p>}
          {!out && at && <p className="context-line">At <b>{placeByRef(at)?.name}</b>.</p>}
          <label className={"capture" + (busy ? " busy" : "")}>
            <CameraMark />
            <span>{busy ? "Reading photo…" : "Take a photo"}</span>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} disabled={busy} />
          </label>
          <div className="capture-alt">
            <label className="pa-btn file-btn">
              Choose from library
              <input type="file" accept="image/*" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} disabled={busy} />
            </label>
            <button type="button" className="pa-btn" onClick={() => setStep("key")}>No photo, just the questions</button>
          </div>
          {err && <p className="notice" role="alert">{err}</p>}
          <p className="quiet small">If the camera doesn't open, Safari may not have permission: Settings, Safari, Camera. Photos stay on this phone.</p>
          <p className="quiet small">The guide covers {SPECIES.length} common Colorado trees, shrubs and wildflowers. <button type="button" className="linkish" onClick={act.openGuide}>Browse the field guide</button></p>
        </section>
      )}

      {step !== "start" && (
        <div className="id-head">
          {shot ? <img className="id-shot" src={shot.thumb} alt="Your photo" /> : <span className="id-shot id-noshot" aria-hidden="true"><LeafGlyph shape="oval" /></span>}
          <div className="id-head-text">
            <div className="det-eyebrow">{step === "key" ? "STEP 2 OF 3 · DESCRIBE IT" : step === "results" ? "STEP 3 OF 3 · MATCHES" : "SAVE TO YOUR ATLAS"}</div>
            <button type="button" className="linkish" onClick={reset}>Start over</button>
          </div>
        </div>
      )}

      {step === "key" && (
        <section className="id-key" aria-label="Describe what you found">
          <fieldset className="q">
            <legend>What is it?</legend>
            <div className="q-choices q-groups">
              {GROUP_CHOICES.map((g) => (
                <button key={g.key} type="button" className={"q-choice" + (group === g.key ? " on" : "")} aria-pressed={group === g.key}
                  onClick={() => { setGroup(g.key); setAnswers({}); }}>
                  <b>{g.label}</b><small>{g.hint}</small>
                </button>
              ))}
            </div>
          </fieldset>
          {group && QUESTIONS[group].map((q) => (
            <fieldset key={q.key} className="q">
              <legend>{q.prompt} <span className="q-skip">skip if unsure</span></legend>
              <div className="q-choices">
                {q.choices.map((c) => (
                  <button key={c.key} type="button" className={"q-choice" + (answers[q.key] === c.key ? " on" : "")}
                    aria-pressed={answers[q.key] === c.key} onClick={() => answer(q.key, c.key)}>
                    <b>{c.label}</b>{c.hint && <small>{c.hint}</small>}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="id-bar">
            <span className="id-bar-txt" aria-live="polite">
              {!group ? "Pick one to start" : answered === 0 ? "Answer what you can see" :
                short[0] ? <>Leading: <b>{short[0].species.common}</b></> : "No match yet"}
            </span>
            <button type="button" className="pa-btn pa-primary" disabled={!group || answered === 0} onClick={() => setStep("results")}>See matches</button>
          </div>
        </section>
      )}

      {step === "results" && group && (
        <section className="id-results" aria-label="Possible matches">
          <p className="id-disclaimer"><Tag p="suggestion" /> Based on your {answered} answer{answered === 1 ? "" : "s"}, not on the photo. Check the field marks before you settle on a name.</p>
          {short.length === 0 && <p className="quiet">Nothing in the guide fits those answers. It may be something the guide doesn't cover yet. You can still save it as unidentified.</p>}
          <ol className="matches">
            {short.map((m) => <MatchCard key={m.species.id} m={m} chosen={chosen === m.species.id} onChoose={() => { setChosen(m.species.id); setStep("save"); }} />)}
          </ol>
          <div className="id-actions">
            <button type="button" className="pa-btn" onClick={() => setStep("key")}>Change answers</button>
            <button type="button" className="pa-btn" onClick={() => setPicking((v) => !v)}>Pick from the guide</button>
            <button type="button" className="pa-btn" onClick={() => { setChosen(null); setStep("save"); }}>Not sure: save unidentified</button>
          </div>
          {picking && <GuidePicker group={group} onPick={(id) => { setChosen(id); setPicking(false); setStep("save"); }} />}
        </section>
      )}

      {step === "save" && (
        <SaveFind
          speciesId={chosen}
          match={matches.find((m) => m.species.id === chosen)}
          candidates={short.map((m) => m.species.id)}
          answers={answers}
          shot={shot}
          defaultPlace={out?.placeRef ?? at}
          outingName={out ? placeByRef(out.placeRef)?.name ?? "your outing" : null}
          onBack={() => setStep(group ? "results" : "key")}
          onSaved={(id) => { reset(); onDone(); act.openObs(id); }}
        />
      )}
    </div>
  );
}

function MatchCard({ m, chosen, onChoose }: { m: Match; chosen: boolean; onChoose: () => void }) {
  const act = useActions();
  const s = m.species;
  const look = s.look.find((l) => l.months.includes(currentMonth()));
  return (
    <li className={"match match-" + m.strength + (chosen ? " on" : "")}>
      <div className="match-top">
        <SpeciesArt s={s} className="match-art" />
        <div className="match-names">
          <span className={"strength strength-" + m.strength}>{STRENGTH_TEXT[m.strength]}</span>
          <b className="match-name">{s.common}</b>
          <i className="match-sci">{s.sci}</i>
          <span className="match-fit">Fits {m.agree} of {m.answered} answers{m.conflicts.length ? ` · differs on ${m.conflicts.map((c) => c.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ")}` : ""}</span>
        </div>
      </div>
      <ul className="ticks match-marks">{s.idMarks.slice(0, 2).map((x) => <li key={x}>{x}</li>)}</ul>
      {!m.inSeason && <p className="match-warn">Usually not in bloom this month. Possible, but less likely.</p>}
      {m.inSeason && look && s.groups.includes("flower") && <p className="match-ok">{look.what} this month in Colorado.</p>}
      {!!s.similar.length && (
        <details className="compare">
          <summary>Compare with similar species</summary>
          <ul>{s.similar.map((x) => <li key={x.id}><b>{speciesById(x.id)?.common}:</b> {x.tell}</li>)}</ul>
        </details>
      )}
      {s.caution && <p className="caution">{s.caution}</p>}
      <div className="match-actions">
        <button type="button" className="pa-btn" onClick={() => act.openSpecies(s.id)}>Field guide</button>
        <button type="button" className="pa-btn pa-primary" onClick={onChoose}>It's this one</button>
      </div>
    </li>
  );
}

function GuidePicker({ group, onPick }: { group: Group; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = SPECIES.filter((s) => (q ? `${s.common} ${s.sci}`.toLowerCase().includes(q.toLowerCase()) : s.groups.includes(group)));
  return (
    <div className="picker">
      <div className="search">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the guide" aria-label="Search the guide" />
      </div>
      <ul className="picker-list">
        {list.map((s) => (
          <li key={s.id}><button type="button" onClick={() => onPick(s.id)}><SpeciesArt s={s} className="gh-art" /><span><b>{s.common}</b><i>{s.sci}</i></span></button></li>
        ))}
      </ul>
    </div>
  );
}

interface SaveProps {
  speciesId: string | null;
  match?: Match;
  candidates: string[];
  answers: Answers;
  shot: Shot | null;
  defaultPlace: PlaceRef | null;
  outingName: string | null;
  onBack: () => void;
  onSaved: (id: string) => void;
}

function SaveFind({ speciesId, match, candidates, answers, shot, defaultPlace, outingName, onBack, onSaved }: SaveProps) {
  const act = useActions();
  const s = speciesById(speciesId);
  const [placeRef, setPlaceRef] = useState<PlaceRef | "">(defaultPlace ?? "");
  const [note, setNote] = useState("");
  const [keepCoords, setKeepCoords] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [near, setNear] = useState<PlaceRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [persist, setPersist] = useState(true);
  useEffect(() => { photosPersist().then(setPersist); }, []);

  const locate = () => {
    if (!navigator.geolocation) { setLocMsg("Location isn't available here."); return; }
    setLocMsg("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) };
        setCoords(c);
        const n = nearestPlaces(c.lat, c.lon, 4).filter((x) => x.mi < 15);
        setNear(n.map((x) => x.place.ref));
        if (n[0] && !placeRef) setPlaceRef(n[0].place.ref);
        setLocMsg(n.length ? `Nearest: ${n[0].place.name} (${n[0].mi.toFixed(1)} mi)` : "No atlas places within 15 miles.");
      },
      () => setLocMsg("Couldn't read your location. Pick a place from the list instead."),
      { timeout: 10000, maximumAge: 120000, enableHighAccuracy: true },
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      let photoId: string | null = null;
      if (shot) { photoId = newId("photo"); await putPhoto(photoId, shot.blob); }
      const o = addObservation({
        kind: "find", speciesId, candidates, idMethod: speciesId ? (match ? "key" : "guide") : "none",
        keyStrength: match?.strength, answers: Object.keys(answers).length ? answers : undefined,
        placeRef: placeRef || null, note: note.trim(), photoId, thumb: shot?.thumb ?? null,
        coords: keepCoords ? coords : null,
      });
      act.toast(s ? `${s.common} added to your atlas` : "Find saved. You can identify it later.");
      onSaved(o.id);
    } finally {
      setSaving(false);
    }
  };

  const grouped = (["trail", "color", "sky"] as const).map((k) => ({ k, places: PLACES.filter((p) => p.kind === k) }));
  return (
    <section className="id-save" aria-label="Save your find">
      <div className="save-what">
        {s ? <SpeciesArt s={s} thumb={shot?.thumb} className="match-art" /> : <span className="art art-glyph match-art obs-unknown" aria-hidden="true">?</span>}
        <div>
          <b className="match-name">{s ? s.common : "Unidentified find"}</b>
          {s ? <i className="match-sci">{s.sci}</i> : <span className="quiet small">Keeps the guide's suggestions so you can name it later.</span>}
          {s && <span className="quiet small">{match ? `Your ID, with the key's ${STRENGTH_TEXT[match.strength].toLowerCase()}` : "Your ID, picked from the guide"}</span>}
        </div>
      </div>

      {outingName ? <p className="context-line">Joins your outing at <b>{outingName}</b>.</p> : null}
      <label className="notes-lbl" htmlFor="find-place">Where</label>
      <div className="field-row">
        <select id="find-place" className="select" value={placeRef} onChange={(e) => setPlaceRef(e.target.value as PlaceRef | "")}>
          <option value="">No place</option>
          {!!near.length && <optgroup label="Near you">{near.map((r) => <option key={"n" + r} value={r}>{placeByRef(r)?.name}</option>)}</optgroup>}
          {grouped.map((g) => (
            <optgroup key={g.k} label={KIND_LABEL[g.k] + "s"}>
              {g.places.map((p) => <option key={p.ref} value={p.ref}>{p.name}</option>)}
            </optgroup>
          ))}
        </select>
        <button type="button" className="pa-btn" onClick={locate}>Near me</button>
      </div>
      {locMsg && <p className="quiet small" role="status">{locMsg}</p>}
      {coords && (
        <label className="check">
          <input type="checkbox" checked={keepCoords} onChange={(e) => setKeepCoords(e.target.checked)} />
          <span>Also save my exact location (±{coords.acc} m). It stays on this phone and is never shared.</span>
        </label>
      )}

      <label className="notes-lbl" htmlFor="find-note">Field note</label>
      <textarea id="find-note" className="notes" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where it was growing, what caught your eye…" />
      {shot && !persist && <p className="notice">This browser can't keep full-size photos, so only a small copy is saved with the find.</p>}
      <div className="id-actions">
        <button type="button" className="pa-btn" onClick={onBack}>Back</button>
        <button type="button" className="pa-btn pa-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save to my atlas"}</button>
      </div>
    </section>
  );
}
