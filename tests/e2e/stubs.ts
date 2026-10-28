import type { Page } from "@playwright/test";

/* Deterministic network: a canned forecast, canned iNaturalist answers, no
   third-party fonts or analytics. Context routes also cover service-worker fetches. */
export const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhwGAhKmMIQAAAABJRU5ErkJggg==", "base64");

export async function stubNetwork(page: Page, errors: string[]) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const ctx = page.context();
  await ctx.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await ctx.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await ctx.route("https://haveanapp-pulse-collect.vercel.app/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await ctx.route("https://inaturalist-open-data.s3.amazonaws.com/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG_1PX }));
  await ctx.route("https://api.open-meteo.com/**", (r) => {
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
    if (u.pathname.includes("species_counts")) body = { results: [
      { count: 375, taxon: { id: 49647, name: "Leucocrinum montanum", preferred_common_name: "common starlily" } },
      { count: 210, taxon: { id: 1592845, name: "Pinus scopulorum", preferred_common_name: "Rocky Mountains Ponderosa Pine" } },
    ] };
    else if (u.pathname.includes("histogram")) body = { results: { month_of_year: { 1: 1, 2: 1, 3: 3, 4: 3, 5: 6, 6: 14, 7: 14, 8: 11, 9: 13, 10: 7, 11: 1, 12: 1 } } };
    else body = { results: [{ id: 54840, name: "Populus tremuloides", preferred_common_name: "quaking aspen", wikipedia_summary: "<b>Populus tremuloides</b> is a deciduous tree.", wikipedia_url: "http://en.wikipedia.org/wiki/Populus_tremuloides", default_photo: photo }] };
    return r.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
}
