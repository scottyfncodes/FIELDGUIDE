import type { Region } from "./types";

/* ---------- REGIONS ----------
   The atlas-level grouping: each region is a handful of AREAS. Region chips
   under the map fly there and narrow the list, so people can explore one part
   of the state at a time. Every area belongs to exactly one region. */
export const REGIONS: Region[] = [
  { key: "front", label: "Front Range", short: "FRONT RANGE", areas: ["boulder", "golden", "lakewood", "morrison", "evergreen", "littleton", "sedalia"] },
  { key: "rmnp", label: "Rocky Mtn NP", short: "RMNP", areas: ["estes"] },
  { key: "i70", label: "I-70 & Summit", short: "I-70", areas: ["idahosprings", "georgetown", "breck", "vail"] },
  { key: "pikes", label: "Pikes Peak", short: "PIKES PEAK", areas: ["springs"] },
  { key: "roaring", label: "Aspen & Glenwood", short: "ASPEN", areas: ["aspen", "glenwood"] },
  { key: "sanluis", label: "Sand Dunes", short: "DUNES", areas: ["dunes"] },
  { key: "sanjuans", label: "San Juans", short: "SAN JUANS", areas: ["ouray", "telluride", "silverton", "durango", "pagosa"] },
  { key: "fourcorners", label: "Four Corners", short: "4 CORNERS", areas: ["cortez"] },
];

export const regionOfArea = (areaKey: string): Region | undefined =>
  REGIONS.find((r) => r.areas.includes(areaKey));

/* ---------- MAP FEATURES ----------
   Reference geography for the sheet. Deliberately sparse: enough to orient
   (state line, the two interstates everyone drives, a few towns, the big
   ranges), not a road atlas. Coordinates are [lon, lat]. */

/* Colorado's border is (almost) a lat/lon rectangle */
export const STATE = { west: -109.05, east: -102.04, south: 37.0, north: 41.0 };

export const NEIGHBORS = [
  { n: "WYOMING", lon: -106.6, lat: 41.09 },
  { n: "NEBRASKA", lon: -102.9, lat: 41.09 },
  { n: "KANSAS", lon: -101.95, lat: 38.6, rot: 90 },
  { n: "NEW MEXICO", lon: -106.0, lat: 36.9 },
  { n: "OKLAHOMA", lon: -102.9, lat: 36.9 },
  { n: "UTAH", lon: -109.15, lat: 39.0, rot: -90 },
];

export const INTERSTATES: { n: string; path: [number, number][] }[] = [
  {
    n: "I-70",
    path: [
      [-109.05, 39.18], [-108.55, 39.08], [-108.2, 39.17], [-107.78, 39.53], [-107.32, 39.55],
      [-107.15, 39.62], [-106.83, 39.65], [-106.37, 39.64], [-106.22, 39.53], [-106.07, 39.63],
      [-105.92, 39.68], [-105.7, 39.71], [-105.51, 39.74], [-105.3, 39.7], [-105.2, 39.72],
      [-104.99, 39.78], [-104.7, 39.75], [-104.3, 39.66], [-103.69, 39.26], [-102.27, 39.3], [-102.04, 39.3],
    ],
  },
  {
    n: "I-25",
    path: [
      [-104.95, 41.0], [-105.0, 40.58], [-104.98, 40.1], [-104.99, 39.74], [-104.86, 39.37],
      [-104.82, 38.83], [-104.61, 38.25], [-104.78, 37.62], [-104.5, 37.17], [-104.47, 37.0],
    ],
  },
];

export const CITIES = [
  { n: "DENVER", lat: 39.739, lon: -104.99, major: true },
  { n: "CO SPRINGS", lat: 38.834, lon: -104.82, major: true },
  { n: "FORT COLLINS", lat: 40.585, lon: -105.084 },
  { n: "PUEBLO", lat: 38.254, lon: -104.61 },
  { n: "GRAND JCT", lat: 39.064, lon: -108.55 },
  { n: "DURANGO", lat: 37.273, lon: -107.88 },
  { n: "ALAMOSA", lat: 37.469, lon: -105.87 },
  { n: "GUNNISON", lat: 38.545, lon: -106.925 },
  { n: "STEAMBOAT", lat: 40.485, lon: -106.831 },
];

export const RANGE_LABELS = [
  { n: "FRONT RANGE", lat: 40.62, lon: -105.72, rot: -72 },
  { n: "SAWATCH", lat: 38.95, lon: -106.35, rot: -75 },
  { n: "ELK MTNS", lat: 39.02, lon: -107.2, rot: -30 },
  { n: "SAN JUANS", lat: 37.98, lon: -107.05, rot: -12 },
  { n: "SANGRE DE CRISTO", lat: 37.85, lon: -105.45, rot: -58 },
  { n: "EASTERN PLAINS", lat: 38.9, lon: -103.3, rot: 0 },
];

/* Rough line of the Continental Divide through the state */
export const DIVIDE: [number, number][] = [
  [-106.2, 41.0], [-105.85, 40.45], [-105.85, 39.95], [-105.75, 39.62], [-106.1, 39.35],
  [-106.45, 38.95], [-106.9, 38.5], [-107.3, 38.1], [-107.6, 37.8], [-106.9, 37.45], [-106.6, 37.0],
];
