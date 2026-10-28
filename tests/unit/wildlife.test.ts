import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIKELIHOOD_TEXT, effectiveLikelihood, identifyPhoto, parseVision, rankWithNearby, verdictLine, visionPrompt, visionStatus, VISION_SCHEMA,
} from "../../src/lib/vision";
import type { VisionAnswer } from "../../src/lib/vision";
import { fetchNearbyWildlife, parseWildTaxon, resolveTaxon } from "../../src/lib/wildlife";
import {
  ATLAS_KEY, getAtlas, keepFound, reloadAtlas, sanitize, toggleSavedFound, addObservation, removeObservation, wildCollection,
} from "../../src/lib/atlas";
import { placeByRef } from "../../src/lib/places";

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const answer = (over: Partial<VisionAnswer> = {}): VisionAnswer => ({
  photo: { usable: true, issues: [] },
  candidates: [
    { scientific_name: "Sialia currucoides", common_name: "Mountain Bluebird", likelihood: "likely", visible_features: ["sky-blue back"], check_next: "Look for a rusty breast." },
    { scientific_name: "Sialia mexicana", common_name: "Western Bluebird", likelihood: "possible", visible_features: [], check_next: "Rusty breast and shoulders." },
  ],
  better_photo_tips: [], safety_note: null, ...over,
});

describe("photo identification: honest about uncertainty", () => {
  it("keeps only well-formed candidates, at most four, without duplicates", () => {
    const raw = { ...answer(), candidates: [
      ...answer().candidates, answer().candidates[0],
      { scientific_name: "", common_name: "x", likelihood: "likely" },
      { scientific_name: "A b", common_name: "c", likelihood: "certain" },
      ...["A a", "B b", "C c"].map((n) => ({ scientific_name: n, common_name: n, likelihood: "unlikely", visible_features: [], check_next: "" })),
    ] };
    const v = parseVision(raw)!;
    expect(v.candidates).toHaveLength(4);
    expect(v.candidates.map((c) => c.likelihood)).not.toContain("certain");
    expect(parseVision({})).toBeNull();
    expect(parseVision("nope")).toBeNull();
  });

  it("no visible animal means no candidates, whatever the model listed", () => {
    const v = parseVision({ ...answer(), photo: { usable: true, issues: ["no_animal"] } })!;
    expect(v.candidates).toEqual([]);
    expect(v.photo.usable).toBe(false);
    expect(verdictLine(v)).toMatch(/no animal/i);
  });

  it("a blurry, distant or dark photo can't produce a 'likely' match", () => {
    for (const issue of ["blurry", "distant", "dark", "partial"] as const) {
      const a = answer({ photo: { usable: true, issues: [issue] } });
      expect(effectiveLikelihood(a.candidates[0], a)).toBe("possible");
    }
    const unusable = answer({ photo: { usable: false, issues: [] } });
    expect(effectiveLikelihood(unusable.candidates[0], unusable)).toBe("possible");
    expect(verdictLine(unusable)).toMatch(/can't settle it/i);
  });

  it("never words a result as certain", () => {
    const lines = [verdictLine(answer()), ...Object.values(LIKELIHOOD_TEXT)];
    lines.forEach((l) => expect(l).not.toMatch(/certain|definitely|confirmed|100%/i));
    expect(verdictLine(answer())).toMatch(/check/i);
  });

  it("nearby sightings reorder within a tier, never lift a long shot above a likely match", () => {
    const c = [
      { likelihood: "possible" as const, taxonId: 1 }, { likelihood: "possible" as const, taxonId: 2 },
      { likelihood: "unlikely" as const, taxonId: 3 }, { likelihood: "likely" as const, taxonId: 4 },
    ];
    expect(rankWithNearby(c, new Set([2, 3])).map((x) => x.taxonId)).toEqual([4, 2, 1, 3]);
  });

  it("the prompt asks for visible marks and forbids certainty; the schema closes every object", () => {
    const p = visionPrompt("bird", 6);
    expect(p).toMatch(/June/);
    expect(p).toMatch(/never claim certainty/i);
    expect(p).not.toMatch(/latitude|colorado/i); // location is never sent to the model
    expect(VISION_SCHEMA.additionalProperties).toBe(false);
    expect(VISION_SCHEMA.properties.candidates.items.additionalProperties).toBe(false);
  });

  it("the client maps server answers to honest outcomes", async () => {
    const call = (status: number, body: unknown = {}) => identifyPhoto({ image: "AAAA", mediaType: "image/jpeg", group: "bird", month: 6 }, vi.fn(() => json(body, status)) as unknown as typeof fetch);
    expect(await call(503)).toEqual({ ok: false, reason: "off" });
    expect(await call(429)).toEqual({ ok: false, reason: "busy" });
    expect(await call(422)).toEqual({ ok: false, reason: "refused" });
    expect(await call(502)).toEqual({ ok: false, reason: "failed" });
    expect(await call(200, { garbage: true })).toEqual({ ok: false, reason: "failed" });
    const ok = await call(200, answer());
    expect(ok.ok && ok.answer.candidates[0].common_name).toBe("Mountain Bluebird");
    expect(await identifyPhoto({ image: "A".repeat(2_000_000), mediaType: "image/jpeg", group: "bird", month: 6 })).toEqual({ ok: false, reason: "too_big" });
  });

  it("knows whether recognition is switched on, and treats a missing endpoint as off", async () => {
    expect(await visionStatus(vi.fn(() => json({ configured: true })) as unknown as typeof fetch)).toBe("on");
    expect(await visionStatus(vi.fn(() => json({ configured: false })) as unknown as typeof fetch)).toBe("off");
    expect(await visionStatus(vi.fn(() => json("", 404)) as unknown as typeof fetch)).toBe("off");
    expect(await visionStatus(vi.fn(() => Promise.resolve(new Response("<!doctype html><title>app</title>"))) as unknown as typeof fetch)).toBe("off");
    expect(await visionStatus(vi.fn(() => Promise.reject(new Error("x"))) as unknown as typeof fetch)).toBe("unknown");
  });
});

describe("wildlife from iNaturalist", () => {
  it("nearby sightings ask for research grade, the right groups and the months around now", async () => {
    let url = "";
    const f = vi.fn((u: string) => { url = u; return json({ results: [{ count: 12, taxon: { id: 14823, name: "Sialia currucoides", preferred_common_name: "Mountain Bluebird", iconic_taxon_name: "Aves" } }] }); });
    const r = await fetchNearbyWildlife(40.123, -105.456, "insect", { month: 1, fetchImpl: f as unknown as typeof fetch });
    expect(url).toMatch(/quality_grade=research/);
    expect(url).toMatch(/iconic_taxa=Insecta,Arachnida/);
    expect(url).toMatch(/month=12,1,2/);
    expect(r![0]).toMatchObject({ taxonId: 14823, count: 12, iconic: "Aves" });
  });

  it("flags threatened or obscured species as sensitive", () => {
    expect(parseWildTaxon({ id: 1, name: "A b", threatened: true })!.sensitive).toBe(true);
    expect(parseWildTaxon({ id: 2, name: "C d", conservation_statuses: [{ status: "EN", status_name: "endangered", authority: "IUCN Red List", iucn: 50 }] })!.sensitive).toBe(true);
    expect(parseWildTaxon({ id: 3, name: "E f", conservation_statuses: [{ status: "LC", status_name: "least concern", iucn: 10 }] })!.sensitive).toBe(false);
    expect(parseWildTaxon({ name: "no id" })).toBeNull();
  });

  it("resolves a model's name to a taxon only on an exact scientific-name match", async () => {
    const f = vi.fn(() => json({ results: [
      { id: 9, name: "Sialia mexicana", iconic_taxon_name: "Aves" },
      { id: 14823, name: "Sialia currucoides", iconic_taxon_name: "Aves", preferred_common_name: "Mountain Bluebird" },
    ] }));
    expect((await resolveTaxon("Sialia currucoides", "bird", f as unknown as typeof fetch))!.id).toBe(14823);
    const g = vi.fn(() => json({ results: [{ id: 5, name: "Sialia sialis", iconic_taxon_name: "Aves" }] }));
    expect(await resolveTaxon("Sialia bluebirdus", "bird", g as unknown as typeof fetch)).toBeNull();
  });
});

describe("the journal keeps wildlife and found trails safely", () => {
  beforeEach(() => { window.localStorage.clear(); reloadAtlas(); });
  const snap = { id: "cotrex:mesa:1001", name: "Mesa Trail", manager: "OSMP", lat: 39.99, lon: -105.28, sub: "OSMP", mappedMi: 1.1, elevMinFt: 5500, elevMaxFt: 5900,
    paths: [[[39.99, -105.28], [39.98, -105.27]]] as [number, number][][], sources: [{ source: "cotrex", id: "1001" }], trailhead: null, updated: null, attrs: { surface: "dirt" } };

  it("a wildlife find keeps its taxon; a sensitive species never keeps coordinates", () => {
    const d = sanitize({ observations: [
      { id: "a", kind: "find", taxon: { id: 14823, name: "Sialia currucoides", common: "Mountain Bluebird", iconic: "Aves", sensitive: false }, coords: { lat: 40, lon: -105, acc: 5 } },
      { id: "b", kind: "find", taxon: { id: 1, name: "Rare thing", sensitive: true }, coords: { lat: 40, lon: -105, acc: 5 } },
      { id: "c", kind: "find", taxon: { id: "bad", name: 3 } },
    ] });
    expect(d.observations[0].taxon!.id).toBe(14823);
    expect(d.observations[0].coords).toEqual({ lat: 40, lon: -105, acc: 5 });
    expect(d.observations[1].coords).toBeNull();
    expect(d.observations[2].taxon).toBeUndefined();
  });

  it("repeat sightings of one species stack on one card, keyed by taxon id", () => {
    const t = { id: 14823, name: "Sialia currucoides", common: "Mountain Bluebird", iconic: "Aves", sensitive: false };
    for (let i = 0; i < 3; i++) addObservation({ kind: "find", speciesId: null, candidates: [], idMethod: "compare", taxon: t, placeRef: null, note: "", photoId: null, thumb: null, coords: null });
    expect(wildCollection(getAtlas())).toHaveLength(1);
    expect(wildCollection(getAtlas())[0].count).toBe(3);
  });

  it("saving a found trail keeps a snapshot that survives a reload; unsaving drops it", () => {
    toggleSavedFound(snap);
    reloadAtlas();
    expect(getAtlas().found).toHaveLength(1);
    expect(placeByRef("found:cotrex:mesa:1001")!.name).toBe("Mesa Trail");
    toggleSavedFound(snap);
    expect(getAtlas().found).toHaveLength(0);
    expect(placeByRef("found:cotrex:mesa:1001")).toBeUndefined();
  });

  it("a find logged at a found trail keeps the snapshot until the find is gone", () => {
    const ref = keepFound(snap);
    const o = addObservation({ kind: "find", speciesId: null, candidates: [], idMethod: "none", placeRef: ref, note: "", photoId: null, thumb: null, coords: null });
    reloadAtlas();
    expect(getAtlas().observations[0].placeRef).toBe(ref);
    removeObservation(o.id);
    expect(getAtlas().found).toHaveLength(0);
    expect(JSON.parse(window.localStorage.getItem(ATLAS_KEY)!).found).toEqual([]);
  });

  it("a reference to a found trail with no snapshot is dropped, not trusted", () => {
    const d = sanitize({ saved: [{ ref: "found:ghost", savedAt: new Date().toISOString() }], observations: [{ id: "x", kind: "find", placeRef: "found:ghost" }] });
    expect(d.saved).toEqual([]);
    expect(d.observations[0].placeRef).toBeNull();
  });
});
