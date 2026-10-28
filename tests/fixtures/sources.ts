/* Canned responses shaped exactly like the live services (checked against
   them while building): ArcGIS REST query JSON for COTREX and the Forest
   Service, Overpass JSON for OpenStreetMap, Nominatim jsonv2. Test data only;
   the app never ships any of this. Geometry sits west of Boulder, Colorado. */

export const ORIGIN = { lat: 40.0, lon: -105.28 };

/* COTREX: "Mesa Trail" as two connected segments, plus filler trails for paging */
const mesaA = [[-105.282, 39.99], [-105.28, 39.985], [-105.278, 39.98]];
const mesaB = [[-105.278, 39.98], [-105.276, 39.975]];

export function cotrexFeatures(extra = 24) {
  const feats: any[] = [
    { attributes: { OBJECTID: 1, feature_id: "1001", name: "Mesa Trail", manager: "City of Boulder Open Space and Mountain Parks", surface: "dirt", type: "Trail", hiking: "yes", bike: "no", horse: "yes", dogs: "leashed", access: " ", min_elevat: 1700.2, max_elevat: 1790.5, length_mi_: 0.7, trail_num: " ", EDIT_DATE: 1684800000000 }, geometry: { paths: [mesaA] } },
    { attributes: { OBJECTID: 2, feature_id: "1002", name: "Mesa Trail", manager: "City of Boulder Open Space and Mountain Parks", surface: "dirt", type: "Trail", hiking: "yes", bike: "no", horse: "yes", dogs: "leashed", access: " ", min_elevat: 1680.0, max_elevat: 1702.1, length_mi_: 0.4, trail_num: " ", EDIT_DATE: 1684800000000 }, geometry: { paths: [mesaB] } },
  ];
  for (let i = 0; i < extra; i++) {
    const lat = 40.02 + i * 0.004, lon = -105.30 - i * 0.004;
    feats.push({
      attributes: { OBJECTID: 100 + i, feature_id: String(2000 + i), name: `Fixture Path ${String(i + 1).padStart(2, "0")}`, manager: "Boulder County Parks and Open Space", surface: "gravel", type: "Trail", hiking: "yes", dogs: i % 2 ? "no" : "yes", min_elevat: 1800 + i, max_elevat: 1900 + i, length_mi_: 1 + i * 0.5, EDIT_DATE: 1684800000000 },
      geometry: { paths: [[[lon, lat], [lon - 0.004, lat + 0.003], [lon - 0.008, lat + 0.004]]] },
    });
  }
  return feats;
}

export const cotrexTrailheads = () => [
  { attributes: { OBJECTID: 9, feature_id: 62117, name: "South Mesa Trailhead", manager: "City of Boulder Open Space and Mountain Parks", fee: "no", water: "yes", bathrooms: "yes" }, geometry: { x: -105.2821, y: 39.9901 } },
];

/* USFS: the same Mesa Trail, mapped separately (dedupe target) */
export const usfsFeatures = () => [
  { attributes: { objectid: 5, trail_cn: "5074.0001", trail_no: "123", trail_name: "MESA TRAIL", gis_miles: 1.1, segment_length: 1.1, trail_class: "3", trail_surface: "NATIVE MATERIAL", typical_trail_grade: "TG05 - +12-20%", accessibility_status: "NOT ACCESSIBLE", hiker_pedestrian_managed: "06/01-10/31", managing_org: "021001" },
    geometry: { paths: [[[-105.2819, 39.9899], [-105.2799, 39.985], [-105.2779, 39.9801], [-105.2761, 39.9751]]] } },
];

/* OSM: the same trail again, plus one only OSM has */
export const overpassElements = () => [
  { type: "way", id: 111, tags: { highway: "path", name: "Mesa Trail", surface: "ground", sac_scale: "hiking" },
    geometry: [{ lat: 39.9901, lon: -105.2821 }, { lat: 39.9851, lon: -105.2801 }, { lat: 39.9799, lon: -105.2779 }] },
  { type: "way", id: 222, tags: { highway: "path", name: "Skunk Canyon Trail", sac_scale: "mountain_hiking", dog: "leashed" },
    geometry: [{ lat: 39.995, lon: -105.29 }, { lat: 39.996, lon: -105.295 }, { lat: 39.998, lon: -105.3 }] },
];

/* NPS and BLM: two trails near Moab, Utah, where COTREX and the national forests
   have nothing (the gap a real search hit). Attribute values copied from the live layers. */
export const MOAB = { lat: 38.573, lon: -109.55 };
export const npsFeatures = () => [
  { attributes: { OBJECTID: 41, TRLNAME: "Park Avenue Trail", TRLSURFACE: "Native", TRLCLASS: "Class 2: Minor Development", TRLUSE: "Hiker/Pedestrian", UNITNAME: "Arches National Park", EDITDATE: 1600000000000, ACCESSNOTES: null },
    geometry: { paths: [[[-109.5823, 38.6283], [-109.5801, 38.6301], [-109.5779, 38.6322]]] } },
  { attributes: { OBJECTID: 42, TRLNAME: "Unrated Spur", TRLSURFACE: "Unknown", TRLCLASS: "Unknown", TRLUSE: null, UNITNAME: "Arches National Park", EDITDATE: null, ACCESSNOTES: null },
    geometry: { paths: [[[-109.59, 38.62], [-109.592, 38.621]]] } },
];
export const blmFeatures = () => [
  { attributes: { OBJECTID: 7001, ROUTE_PRMRY_NM: "MOAB BRAND TRAILS", OBSRVE_SRFCE_TYPE: "Natural", PLAN_MODE_TRNSPRT: "Non-Mechanized; Mechanized", PLAN_ACCESS_RSTRCT: "None", BLM_MILES: 1.2, GIS_MILES: 1.2, ADMIN_ST: "UT" },
    geometry: { paths: [[[-109.6201, 38.6501], [-109.6182, 38.6489], [-109.6163, 38.6472]]] } },
];

export const nominatimResults = () => [
  { place_id: 1, osm_type: "relation", osm_id: 112474, lat: "40.0149856", lon: "-105.2705456", category: "boundary", type: "administrative", addresstype: "city", name: "Boulder", display_name: "Boulder, Boulder County, Colorado, United States" },
  { place_id: 2, osm_type: "node", osm_id: 999, lat: "40.0076", lon: "-105.2659", category: "amenity", type: "university", addresstype: "amenity", name: "University of Colorado Boulder", display_name: "University of Colorado Boulder, Boulder, Boulder County, Colorado, 80309, United States" },
];

/** A URL router for fetch stubs: every source answers from the fixtures above. */
export function sourceResponse(url: string, _init?: { body?: unknown }, opts: { cotrexExtra?: number; federal?: boolean } = {}): unknown | undefined {
  if (url.includes("nominatim.openstreetmap.org/search")) return nominatimResults();
  if (url.includes("nominatim.openstreetmap.org/reverse")) return { address: { city: "Boulder", state: "Colorado" } };
  if (url.includes("Colorado_State_Basemap/MapServer/40/query")) {
    const feats = cotrexFeatures(opts.cotrexExtra);
    return url.includes("returnCountOnly=true") ? { count: feats.length } : { features: feats, exceededTransferLimit: false };
  }
  if (url.includes("Colorado_State_Basemap/MapServer/29/query")) return { features: cotrexTrailheads() };
  if (url.includes("EDW_TrailNFSPublish")) return url.includes("returnCountOnly=true") ? { count: 1 } : { features: usfsFeatures() };
  if (url.includes("mapservices.nps.gov")) return url.includes("returnCountOnly=true") ? { count: opts.federal ? 2 : 0 } : { features: opts.federal ? npsFeatures() : [] };
  if (url.includes("gis.blm.gov")) return url.includes("returnCountOnly=true") ? { count: opts.federal ? 1 : 0 } : { features: opts.federal ? blmFeatures() : [] };
  if (url.includes("overpass-api.de")) return { elements: overpassElements() };
  if (url.includes("api.open-meteo.com/v1/elevation")) {
    const n = new URL(url).searchParams.get("latitude")!.split(",").length;
    return { elevation: Array.from({ length: n }, (_, i) => 1700 + i * 4) };
  }
  if (url.includes("api.inaturalist.org")) return { results: [] };
  return undefined;
}
