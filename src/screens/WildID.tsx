import { useEffect, useMemo, useState } from "react";
import { activeOuting, addObservation, newId, useAtlas } from "../lib/atlas";
import type { WildRef } from "../lib/atlas";
import { PLACES, KIND_LABEL, foundPlaces, nearestPlaces, placeByRef } from "../lib/places";
import type { PlaceRef } from "../lib/places";
import { photosPersist, processImage, putPhoto, uploadCopy } from "../lib/photos";
import { currentMonth } from "../lib/season";
import { locate } from "../lib/locate";
import type { Origin } from "../lib/discover";
import {
  IDENTIFY_FAIL_TEXT, ISSUE_TEXT, LIKELIHOOD_TEXT, effectiveLikelihood, groupMeta, identifyPhoto, rankWithNearby, verdictLine, visionStatus,
} from "../lib/vision";
import type { IdentifyOutcome, Likelihood, VisionCandidate, VisionStatus, WildGroup } from "../lib/vision";
import { fetchNearbyWildlife, fetchWildTaxon, resolveTaxon, searchWildTaxa } from "../lib/wildlife";
import type { WildSpecies, WildTaxon } from "../lib/wildlife";
import { LICENSE_TEXT } from "../lib/inat";
import { CameraMark } from "../components/Glyphs";
import { Tag } from "../components/atlasBits";
import { WildArt, groupTabLabel, useWildNearby } from "../components/Wildlife";
import { useActions } from "../components/PlaceSections";

/* ---------- NATURE ID: WILDLIFE ----------
   Three separate things, kept separate on screen:
     1. Photo recognition (when the site has it switched on): a model's
        suggestions from the picture alone, labelled as suggestions, capped by
        photo quality, never "certain".
     2. Species information: iNaturalist, matched by taxon id.
     3. Where it's been seen: research-grade sightings near the person.
        Context for ranking and comparing, never proof.
   Without photo recognition the comparison view is the way to a name: the
   person matches their photo against species actually recorded nearby. */

interface Shot { blob: Blob; thumb: string }
type Step = "photo" | "results" | "compare" | "save";
interface Resolved { c: VisionCandidate; likelihood: Likelihood; taxon: WildTaxon | null; taxonId: number | null }
interface Choice { taxon: WildRef; photo: WildSpecies["photo"]; how: "photo" | "compare" | "search"; likelihood?: Likelihood; sensitivityUnknown?: boolean }

interface Props {
  group: WildGroup;
  at: PlaceRef | null;
  near: Origin | null;
  onBack: () => void;
  onDone: (obsId: string) => void;
}

export function WildID({ group, at, near, onBack, onDone }: Props) {
  const act = useActions();
  const atlas = useAtlas();
  const out = activeOuting(atlas);
  const month = currentMonth();
  const meta = groupMeta(group);
  const [step, setStep] = useState<Step>("photo");
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [vision, setVision] = useState<VisionStatus>("unknown");
  const [outcome, setOutcome] = useState<IdentifyOutcome | null>(null);
  const [resolved, setResolved] = useState<Resolved[] | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);

  /* where "nearby" means: the outing's place, the place this was opened from, the search point, or a fix on request */
  const placeRef = out?.placeRef ?? at;
  const place = placeByRef(placeRef);
  const [gps, setGps] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const where = place ? { lat: place.lat, lon: place.lon, label: place.name } : gps ? { ...gps, label: "your location" } : near ? { lat: near.lat, lon: near.lon, label: near.label } : null;
  const nearby = useWildNearby(where?.lat ?? null, where?.lon ?? null, group, month, 10);
  const nearbyIds = useMemo(() => new Set(nearby.state === "ok" ? nearby.value.map((n) => n.taxonId) : []), [nearby]);
  const countOf = (id: number | null) => (id && nearby.state === "ok" ? nearby.value.find((n) => n.taxonId === id)?.count ?? 0 : 0);

  useEffect(() => { visionStatus().then(setVision); }, []);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.type && !f.type.startsWith("image/")) { setErr("That file isn't a photo."); return; }
    setBusy(true); setErr(null);
    try {
      const p = await processImage(f);
      setShot({ blob: p.blob, thumb: p.thumb });
    } catch {
      setErr("Couldn't read that photo. Try taking it again, or pick one from your library.");
    } finally {
      setBusy(false);
    }
  };

  const recognize = async () => {
    if (!shot) return;
    setBusy(true); setErr(null); setOutcome(null); setResolved(null); setStep("results");
    let o: IdentifyOutcome;
    try {
      o = await identifyPhoto({ image: await uploadCopy(shot.blob), mediaType: "image/jpeg", group, month });
    } catch {
      o = { ok: false, reason: "failed" };
    }
    setOutcome(o);
    if (o.ok) {
      const rs = await Promise.all(o.answer.candidates.map(async (c) => {
        const taxon = await resolveTaxon(c.scientific_name, group);
        return { c, likelihood: effectiveLikelihood(c, o.answer), taxon, taxonId: taxon?.id ?? null };
      }));
      setResolved(rs);
    }
    setBusy(false);
  };

  const useMyLocation = async () => {
    const r = await locate();
    if (r.ok) setGps({ lat: r.lat, lon: r.lon, acc: r.acc });
    else setErr(r.reason === "denied" ? "Location is turned off for this site. Search by name instead." : "Couldn't get your location. Search by name instead.");
  };

  const ranked = resolved ? rankWithNearby(resolved, nearbyIds) : null;
  const answer = outcome?.ok ? outcome.answer : null;

  /* sensitivity comes from iNaturalist's taxon record; if it can't be checked, location isn't kept */
  const pick = async (t: { id: number; name: string; common: string | null; iconic: string | null; photo: WildSpecies["photo"] }, how: Choice["how"], likelihood?: Likelihood) => {
    /* always the full record: search results carry no conservation statuses */
    const full = await fetchWildTaxon(t.id);
    const unknown = !full;
    const sensitive = full ? full.sensitive : true;
    setChoice({ taxon: { id: t.id, name: t.name, common: t.common, iconic: t.iconic, sensitive }, photo: t.photo, how, likelihood, sensitivityUnknown: unknown });
    setStep("save");
  };

  return (
    <div className="wild">
      <div className="id-head">
        {shot ? <img className="id-shot" src={shot.thumb} alt="Your photo" /> : <span className="id-shot id-noshot" aria-hidden="true"><CameraMark /></span>}
        <div className="id-head-text">
          <div className="det-eyebrow">{meta.label.toUpperCase()} · {step === "photo" ? "YOUR PHOTO" : step === "results" ? "FROM THE PHOTO" : step === "compare" ? "COMPARE" : "SAVE TO YOUR JOURNAL"}</div>
          <button type="button" className="linkish" onClick={onBack}>Start over</button>
        </div>
      </div>
      {(out || place) && <p className="context-line">{out ? "Saving to your outing at" : "At"} <b>{place?.name ?? "an unnamed place"}</b>.</p>}

      {step === "photo" && (
        <section aria-label="Your photo">
          {!shot ? <>
            <label className={"capture" + (busy ? " busy" : "")}>
              <CameraMark />
              <span>{busy ? "Reading photo…" : `Photograph the ${meta.label.toLowerCase()}`}</span>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} disabled={busy} />
            </label>
            <div className="capture-alt">
              <label className="pa-btn file-btn">
                Choose from library
                <input type="file" accept="image/*" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} disabled={busy} />
              </label>
              <button type="button" className="pa-btn" onClick={() => setStep("compare")}>No photo: browse nearby</button>
            </div>
          </> : (
            <div className="shot-ready">
              <img src={shot.thumb} alt="Your photo" className="shot-big" />
              <div className="id-actions">
                {vision === "on" && <button type="button" className="pa-btn pa-primary" onClick={recognize}>Suggest from the photo</button>}
                <button type="button" className={"pa-btn" + (vision === "on" ? "" : " pa-primary")} onClick={() => setStep("compare")}>Compare with species seen nearby</button>
                <button type="button" className="pa-btn" onClick={() => setShot(null)}>Retake</button>
              </div>
            </div>
          )}
          {err && <p className="notice" role="alert">{err}</p>}
          <div className="how-note">
            {vision === "on" ? (
              <p><Tag p="suggestion" /> Photo suggestions come from an AI vision model that sees only the picture. The photo is sent once for that and not stored; location tags are stripped first. It can be wrong, so every suggestion shows the marks to check.</p>
            ) : vision === "off" ? (
              <p>Photo recognition isn't switched on for this site yet. You can still name it by comparing your photo with species recorded nearby on iNaturalist, or save it now and name it later.</p>
            ) : (
              <p>Checking whether photo recognition is available…</p>
            )}
            <p className="quiet small">Tips: fill the frame, keep it sharp, and get the {group === "bird" ? "head, bill and wing" : group === "insect" ? "top of the wings or the whole body from above" : "face and the whole body side-on"} if you can.</p>
          </div>
        </section>
      )}

      {step === "results" && (
        <section className="id-results" aria-label="Suggestions from the photo">
          {busy && (
            <div className="loading-card" role="status">
              <span className="lc-dots" aria-hidden="true"><i /><i /><i /></span>
              <p>Looking at the photo, then matching names to iNaturalist…</p>
            </div>
          )}
          {outcome && !outcome.ok && (
            <div className="empty" role="alert">
              <p className="empty-title">{IDENTIFY_FAIL_TEXT[outcome.reason]}</p>
              <div className="id-actions">
                {outcome.reason !== "off" && <button type="button" className="pa-btn" onClick={recognize}>Try again</button>}
                <button type="button" className="pa-btn pa-primary" onClick={() => setStep("compare")}>Compare with species seen nearby</button>
              </div>
            </div>
          )}
          {answer && ranked && <>
            <p className="id-verdict">{verdictLine(answer)}</p>
            <p className="id-disclaimer"><Tag p="suggestion" /> From the photo alone, by an AI model. Sightings nearby are context, not proof.</p>
            {(!!answer.photo.issues.length || !!answer.better_photo_tips.length) && (
              <div className="photo-issues">
                {!!answer.photo.issues.length && <ul className="ticks">{answer.photo.issues.map((i) => <li key={i}>{ISSUE_TEXT[i]}</li>)}</ul>}
                {!!answer.better_photo_tips.length && <>
                  <p className="quiet small">A better photo would help:</p>
                  <ul className="ticks">{answer.better_photo_tips.map((t) => <li key={t}>{t}</li>)}</ul>
                </>}
              </div>
            )}
            {answer.safety_note && <p className="caution">{answer.safety_note}</p>}
            <ol className="matches">
              {ranked.map((r) => <Candidate key={r.c.scientific_name} r={r} records={countOf(r.taxonId)} hasNearby={nearby.state === "ok"} whereLabel={where?.label ?? null}
                onPick={() => r.taxon && pick({ ...r.taxon, photo: r.taxon.photo }, "photo", r.likelihood)} />)}
            </ol>
            {!ranked.length && <p className="quiet">No suggestions from this photo. Compare with species seen nearby, or save it and name it later.</p>}
          </>}
          <div className="id-actions">
            <button type="button" className="pa-btn" onClick={() => setStep("compare")}>None of these: compare nearby</button>
            <button type="button" className="pa-btn" onClick={() => { setChoice(null); setStep("save"); }}>Not sure: save unidentified</button>
          </div>
        </section>
      )}

      {step === "compare" && (
        <Compare group={group} shot={shot} where={where} nearby={nearby} onLocate={useMyLocation}
          onPick={(s) => pick({ id: s.taxonId, name: s.name, common: s.common, iconic: s.iconic, photo: s.photo }, s.how)}
          onUnsure={() => { setChoice(null); setStep("save"); }} err={err} />
      )}

      {step === "save" && (
        <WildSave choice={choice} shot={shot} defaultPlace={placeRef ?? null} outingName={out ? place?.name ?? "your outing" : null}
          onBack={() => setStep(answer ? "results" : "compare")}
          onSaved={(id) => { act.toast(choice ? `${choice.taxon.common ?? choice.taxon.name} added to your journal` : "Saved. You can name it later."); onDone(id); }} />
      )}
    </div>
  );
}

function Candidate({ r, records, hasNearby, whereLabel, onPick }: { r: Resolved; records: number; hasNearby: boolean; whereLabel: string | null; onPick: () => void }) {
  const act = useActions();
  const name = r.taxon?.common ?? r.c.common_name;
  return (
    <li className={"match match-" + (r.likelihood === "likely" ? "strong" : r.likelihood === "possible" ? "possible" : "weak")}>
      <div className="match-top">
        <WildArt photo={r.taxon?.photo ?? null} className="match-art" />
        <div className="match-names">
          <span className={"strength strength-" + (r.likelihood === "likely" ? "strong" : r.likelihood === "possible" ? "possible" : "weak")}>{LIKELIHOOD_TEXT[r.likelihood]}</span>
          <b className="match-name">{name}</b>
          <i className="match-sci">{r.taxon?.name ?? r.c.scientific_name}</i>
          {hasNearby && r.taxonId != null && whereLabel && (
            <span className="match-fit">{records ? `${records} research-grade sighting${records === 1 ? "" : "s"} within 10 km this season` : `No research-grade sightings within 10 km this season`}</span>
          )}
        </div>
      </div>
      {!!r.c.visible_features.length && <>
        <p className="quiet small match-saw">What the model saw in your photo:</p>
        <ul className="ticks match-marks">{r.c.visible_features.map((x) => <li key={x}>{x}</li>)}</ul>
      </>}
      {r.c.check_next && <p className="match-check"><b>Check:</b> {r.c.check_next}</p>}
      {r.taxon?.sensitive && <p className="sensitive-note">At risk here or location-protected on iNaturalist. Its location won't be saved.</p>}
      {!r.taxon && <p className="match-warn">Couldn't match this name to an iNaturalist species, so it can't be saved under this name.</p>}
      {r.taxon && (
        <div className="match-actions">
          <button type="button" className="pa-btn" onClick={() => act.openTaxon(r.taxon!.id)}>Species page</button>
          <button type="button" className="pa-btn pa-primary" onClick={onPick}>It's this one</button>
        </div>
      )}
    </li>
  );
}

function Compare({ group, shot, where, nearby, onLocate, onPick, onUnsure, err }: {
  group: WildGroup;
  shot: Shot | null;
  where: { lat: number; lon: number; label: string } | null;
  nearby: ReturnType<typeof useWildNearby>;
  onLocate: () => void;
  onPick: (s: WildSpecies & { how: "compare" | "search" }) => void;
  onUnsure: () => void;
  err: string | null;
}) {
  const act = useActions();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<WildSpecies[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [anyTime, setAnyTime] = useState<WildSpecies[] | null>(null);
  const [focus, setFocus] = useState<(WildSpecies & { how: "compare" | "search" }) | null>(null);
  const month = currentMonth();

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setSearching(true);
    setHits(await searchWildTaxa(q, group));
    setSearching(false);
  };
  const loadAnyTime = async () => {
    if (!where) return;
    setAnyTime(await fetchNearbyWildlife(where.lat, where.lon, group, { radiusKm: 10, month: null }) ?? []);
  };

  const list = anyTime ?? (nearby.state === "ok" ? nearby.value : []);
  const tiles = (xs: WildSpecies[], how: "compare" | "search") => (
    <ul className="wild-grid">
      {xs.map((s) => (
        <li key={s.taxonId}>
          <button type="button" className={"wild-tile" + (focus?.taxonId === s.taxonId ? " on" : "")} onClick={() => setFocus({ ...s, how })} aria-pressed={focus?.taxonId === s.taxonId}>
            <WildArt photo={s.photo} className="wt-art" />
            <b>{s.common ?? s.name}</b>
            <small>{how === "compare" ? `${s.count} sighting${s.count === 1 ? "" : "s"}` : s.name}</small>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="compare-view" aria-label="Compare with species">
      {focus && (
        <div className="side-by-side" role="group" aria-label={`Comparing with ${focus.common ?? focus.name}`}>
          <figure>
            {shot ? <img src={shot.thumb} alt="Your photo" /> : <span className="sbs-empty">No photo</span>}
            <figcaption>Yours</figcaption>
          </figure>
          <figure>
            {focus.photo ? <img src={focus.photo.medium} alt={`${focus.common ?? focus.name}, from iNaturalist`} /> : <span className="sbs-empty">No reference photo</span>}
            <figcaption>{focus.photo ? `${focus.photo.attribution} · ${LICENSE_TEXT(focus.photo.license)}` : "iNaturalist"}</figcaption>
          </figure>
          <div className="sbs-name"><b>{focus.common ?? focus.name}</b> <i>{focus.name}</i></div>
          <div className="id-actions">
            <button type="button" className="pa-btn" onClick={() => act.openTaxon(focus.taxonId)}>Species page</button>
            <button type="button" className="pa-btn pa-primary" onClick={() => onPick(focus)}>It's this one</button>
          </div>
          <p className="quiet small">You make the match. One photo can look like several species; check the species page for the marks that tell them apart.</p>
        </div>
      )}

      <h3 className="wild-hd">{groupTabLabel[group]} seen near {where ? where.label : "you"} <Tag p="inat" /></h3>
      {!where ? (
        <div className="notice-row">
          <p className="quiet">To show what's been seen nearby, share your location, open Nature ID from a trail, or set a place in Explore. Or search by name below.</p>
          <button type="button" className="pa-btn" onClick={onLocate}>Use my location</button>
        </div>
      ) : <>
        <p className="quiet small">
          Research-grade iNaturalist sightings within 10 km, {anyTime ? "any time of year" : `${["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"][month - 1]} to ${["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan"][month - 1]}`},
          most seen first. Being common here makes a species more likely, not certain.
        </p>
        {nearby.state === "loading" && !anyTime && <p className="quiet">Loading sightings…</p>}
        {nearby.state === "failed" && !anyTime && <p className="quiet">Couldn't reach iNaturalist. Search by name when you have signal, or save it now and name it later.</p>}
        {list.length ? tiles(list, "compare") : (nearby.state === "ok" || anyTime) ? <p className="quiet">No sightings this close{anyTime ? "" : " at this time of year"}.</p> : null}
        {!anyTime && nearby.state === "ok" && <button type="button" className="more-btn more-quiet" onClick={loadAnyTime}>Show any time of year</button>}
      </>}
      {err && <p className="notice" role="alert">{err}</p>}

      <form className="lp-form wild-search" onSubmit={search} role="search">
        <label htmlFor="wild-q" className="sr-only">Search {groupTabLabel[group].toLowerCase()} by name</label>
        <div className="search">
          <input id="wild-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${groupTabLabel[group].toLowerCase()} by name`} enterKeyHint="search" />
        </div>
        <button type="submit" className="pa-btn" disabled={searching}>{searching ? "Looking…" : "Search"}</button>
      </form>
      {hits && (hits.length ? tiles(hits, "search") : <p className="quiet">No {groupTabLabel[group].toLowerCase()} by that name on iNaturalist.</p>)}

      <div className="id-actions">
        <button type="button" className="pa-btn" onClick={onUnsure}>Not sure: save unidentified</button>
      </div>
    </section>
  );
}

type LocChoice = "none" | "approx" | "exact";

function WildSave({ choice, shot, defaultPlace, outingName, onBack, onSaved }: {
  choice: Choice | null; shot: Shot | null; defaultPlace: PlaceRef | null; outingName: string | null;
  onBack: () => void; onSaved: (id: string) => void;
}) {
  const [placeRef, setPlaceRef] = useState<PlaceRef | "">(defaultPlace ?? "");
  const [note, setNote] = useState("");
  const [loc, setLoc] = useState<LocChoice>("none");
  const [coords, setCoords] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [persist, setPersist] = useState(true);
  const sensitive = !!choice?.taxon.sensitive;
  useEffect(() => { photosPersist().then(setPersist); }, []);

  const wantLoc = async (c: LocChoice) => {
    setLoc(c);
    if (c === "none" || coords) return;
    setLocMsg("Locating…");
    const r = await locate();
    if (!r.ok) { setLocMsg(r.reason === "denied" ? "Location is turned off for this site, so none will be saved." : "Couldn't get your location, so none will be saved."); setLoc("none"); return; }
    setCoords({ lat: r.lat, lon: r.lon, acc: r.acc });
    const n = nearestPlaces(r.lat, r.lon, 1).filter((x) => x.mi < 2);
    if (n[0] && !placeRef) setPlaceRef(n[0].place.ref);
    setLocMsg(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      let photoId: string | null = null;
      if (shot) { photoId = newId("photo"); await putPhoto(photoId, shot.blob); }
      const kept = sensitive || loc === "none" || !coords ? null
        : loc === "approx" ? { lat: Math.round(coords.lat * 100) / 100, lon: Math.round(coords.lon * 100) / 100, acc: Math.max(coords.acc, 1000), approx: true }
        : coords;
      const o = addObservation({
        kind: "find", speciesId: null, candidates: [], idMethod: choice ? choice.how : "none",
        taxon: choice?.taxon ?? null, ...(choice?.likelihood ? { photoLikelihood: choice.likelihood } : {}),
        placeRef: placeRef || null, note: note.trim(), photoId, thumb: shot?.thumb ?? null, coords: kept,
      });
      onSaved(o.id);
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    { label: "Your saved trails", places: foundPlaces() },
    ...(["trail", "color", "sky"] as const).map((k) => ({ label: KIND_LABEL[k] + "s", places: PLACES.filter((p) => p.kind === k) })),
  ].filter((g) => g.places.length);

  return (
    <section className="id-save" aria-label="Save your sighting">
      <div className="save-what">
        <WildArt photo={choice?.photo ?? null} thumb={shot?.thumb} className="match-art" />
        <div>
          <b className="match-name">{choice ? choice.taxon.common ?? choice.taxon.name : "Unidentified sighting"}</b>
          {choice ? <i className="match-sci">{choice.taxon.name}</i> : <span className="quiet small">Save it now and name it later.</span>}
          {choice && <span className="quiet small">{choice.how === "photo" ? `Your ID, from a photo suggestion (${LIKELIHOOD_TEXT[choice.likelihood ?? "possible"].toLowerCase()})` : choice.how === "compare" ? "Your ID, compared with sightings nearby" : "Your ID, found by name"}</span>}
        </div>
      </div>
      {outingName && <p className="context-line">Joins your outing at <b>{outingName}</b>.</p>}
      <label className="notes-lbl" htmlFor="wild-place">Where</label>
      <select id="wild-place" className="select" value={placeRef} onChange={(e) => setPlaceRef(e.target.value as PlaceRef | "")}>
        <option value="">No place</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>{g.places.map((p) => <option key={p.ref} value={p.ref}>{p.name}</option>)}</optgroup>
        ))}
      </select>

      <fieldset className="loc-choice">
        <legend className="notes-lbl">Your location</legend>
        {sensitive ? (
          <p className="sensitive-note">{choice?.sensitivityUnknown
            ? "Couldn't check whether this species is sensitive (no connection), so its location isn't saved. The place name above is enough for your journal."
            : "This species is sensitive or at risk, so its location isn't saved. The place name above is enough for your journal."}</p>
        ) : <>
          {(["none", "approx", "exact"] as const).map((c) => (
            <label key={c} className="check">
              <input type="radio" name="loc" checked={loc === c} onChange={() => wantLoc(c)} />
              <span>{c === "none" ? "Don't save my location" : c === "approx" ? "Approximate, rounded to about 1 km" : `Exact${coords ? ` (±${coords.acc} m)` : ""}`}</span>
            </label>
          ))}
          <p className="quiet small">Kept only on this phone and never shared. You can remove it from the find later.</p>
          {locMsg && <p className="quiet small" role="status">{locMsg}</p>}
        </>}
      </fieldset>

      <label className="notes-lbl" htmlFor="wild-note">Field note</label>
      <textarea id="wild-note" className="notes" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What it was doing, the habitat, the call…" />
      {shot && !persist && <p className="notice">This browser can't keep full-size photos, so only a small copy is saved with the find.</p>}
      <div className="id-actions">
        <button type="button" className="pa-btn" onClick={onBack}>Back</button>
        <button type="button" className="pa-btn pa-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save to my journal"}</button>
      </div>
    </section>
  );
}
