import type { Page } from "@playwright/test";
import { sourceResponse } from "../fixtures/sources";

/* Deterministic network: a canned forecast, canned iNaturalist answers, no
   third-party fonts or analytics. Context routes also cover service-worker fetches. */
export const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhwGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/* two birds for the wildlife flows (test data; ids only need to be consistent here) */
export const BIRDS = [
  { id: 14823, name: "Sialia currucoides", preferred_common_name: "Mountain Bluebird", iconic_taxon_name: "Aves", count: 42 },
  { id: 9083, name: "Cyanocitta stelleri", preferred_common_name: "Steller's Jay", iconic_taxon_name: "Aves", count: 120 },
];

export async function stubNetwork(page: Page, errors: string[]) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const ctx = page.context();
  await ctx.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await ctx.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await ctx.route("https://haveanapp-pulse-collect.vercel.app/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await ctx.route("https://inaturalist-open-data.s3.amazonaws.com/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG_1PX }));
  /* live trail sources and the geocoder answer from the shared fixtures */
  for (const host of ["https://nominatim.openstreetmap.org/**", "https://photon.komoot.io/**", "https://gis.colorado.gov/**", "https://apps.fs.usda.gov/**", "https://mapservices.nps.gov/**", "https://gis.blm.gov/**", "https://overpass-api.de/**"]) {
    await ctx.route(host, (r) => {
      const body = sourceResponse(r.request().url());
      return body === undefined ? r.fulfill({ status: 404, body: "" }) : r.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    });
  }
  /* photo recognition: off unless a test switches it on */
  await ctx.route("**/api/identify", (r) => r.request().method() === "GET"
    ? r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false, model: null }) })
    : r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "not_configured" }) }));
  await ctx.route("https://api.open-meteo.com/**", (r) => {
    if (r.request().url().includes("/v1/elevation")) return r.fulfill({ contentType: "application/json", body: JSON.stringify(sourceResponse(r.request().url())) });
    const n = new URL(r.request().url()).searchParams.get("latitude")!.split(",").length;
    const day = (i: number) => ({ daily: {
      temperature_2m_max: [i % 7 === 0 ? 96 : 70], temperature_2m_min: [44], wind_speed_10m_max: [8],
      wind_gusts_10m_max: [14], precipitation_probability_max: [i % 5 === 0 ? 35 : 5], weather_code: [1],
    } });
    return r.fulfill({ contentType: "application/json", body: JSON.stringify(Array.from({ length: n }, (_, i) => day(i))) });
  });
  await ctx.route("https://api.inaturalist.org/**", (r) => {
    const u = new URL(r.request().url());
    const photo = { square_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg", medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg", attribution: "(c) Test Observer, some rights reserved (CC BY-NC)", license_code: "cc-by-nc" };
    let body: unknown;
    const iconic = u.searchParams.get("iconic_taxa") ?? "";
    if (u.pathname.includes("species_counts") && iconic.includes("Aves")) body = { results: BIRDS.map((b) => ({ count: b.count, taxon: { ...b, default_photo: photo } })) };
    else if (u.pathname.includes("species_counts") && iconic && !iconic.includes("Plantae")) body = { results: [] };
    else if (/\/taxa\/\d+$/.test(u.pathname)) {
      const b = BIRDS.find((x) => u.pathname.endsWith("/" + x.id));
      body = { results: [b ? { ...b, rank: "species", default_photo: photo, wikipedia_summary: "A small thrush of open country.", observations_count: 1000, conservation_statuses: [] }
        : { id: 54840, name: "Populus tremuloides", preferred_common_name: "quaking aspen", wikipedia_summary: "<b>Populus tremuloides</b> is a deciduous tree.", wikipedia_url: "http://en.wikipedia.org/wiki/Populus_tremuloides", default_photo: photo }] };
    } else if (u.pathname === "/v1/taxa" || u.pathname.endsWith("/taxa/autocomplete")) {
      const q = (u.searchParams.get("q") ?? "").toLowerCase();
      body = { results: BIRDS.filter((b) => b.name.toLowerCase().includes(q) || b.preferred_common_name.toLowerCase().includes(q)).map((b) => ({ ...b, default_photo: photo })) };
    }
    else if (u.pathname.includes("species_counts")) body = { results: [
      { count: 375, taxon: { id: 49647, name: "Leucocrinum montanum", preferred_common_name: "common starlily" } },
      { count: 210, taxon: { id: 1592845, name: "Pinus scopulorum", preferred_common_name: "Rocky Mountains Ponderosa Pine" } },
    ] };
    else if (u.pathname.includes("histogram")) body = { results: { month_of_year: { 1: 1, 2: 1, 3: 3, 4: 3, 5: 6, 6: 14, 7: 14, 8: 11, 9: 13, 10: 7, 11: 1, 12: 1 } } };
    else body = { results: [{ id: 54840, name: "Populus tremuloides", preferred_common_name: "quaking aspen", wikipedia_summary: "<b>Populus tremuloides</b> is a deciduous tree.", wikipedia_url: "http://en.wikipedia.org/wiki/Populus_tremuloides", default_photo: photo }] };
    return r.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
}
