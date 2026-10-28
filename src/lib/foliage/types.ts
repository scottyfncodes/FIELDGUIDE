/* Ported verbatim from Leaf Hunter (scottyfncodes/Leaf-Hunter, src/domain). Tests in tests/unit/foliage.test.ts. */
/**
 * Core Leaf Hunter data model.
 *
 * Everything here is region-agnostic. Colorado is the first region, but a
 * Region can describe any state/area with its own locations, season window,
 * and map geometry.
 */

export type FoliageStatus = 'early' | 'turning' | 'peak' | 'past';

export type Activity =
  | 'drive'
  | 'hike'
  | 'photo'
  | 'dog'
  | 'accessible'
  | 'sunrise'
  | 'sunset';

export type LocationKind = 'pass' | 'grove' | 'drive' | 'hike' | 'foothills' | 'town';

export type AccessType = 'paved' | 'gravel' | 'high-clearance' | 'trail' | 'town';

/** An ISO-less month/day marker, e.g. "09-25". Year-agnostic on purpose. */
export type MonthDay = `${string}-${string}`;

export interface TypicalWindow {
  /** Typical first day of peak color (month-day). */
  peakStart: MonthDay;
  /** Typical last day of peak color (month-day). */
  peakEnd: MonthDay;
}

export interface FoliageLocation {
  id: string;
  regionId: string;
  name: string;
  /** Nearest town or gateway, used in search and cards. */
  town: string;
  /** Sub-region label, e.g. "Front Range", "San Juans". */
  area: string;
  kind: LocationKind;
  latitude: number;
  longitude: number;
  /** Elevation of the viewing area in feet. */
  elevationFt: number;
  accessType: AccessType;
  activities: Activity[];
  /** Short, concrete reasons to go. */
  whyGo: string[];
  /** One-paragraph description. */
  summary: string;
  /** Typical timing based on elevation, latitude and history. Estimates only. */
  typical: TypicalWindow;
  /** Road corridor used for trip sequencing, e.g. "us-285". */
  corridor: string;
  /** Optional search aliases (alternate names, nearby towns). */
  aliases?: string[];
  /** Approximate stop time in minutes for a typical visit. */
  visitMinutes: number;
}

export type ReportSource = 'demo' | 'local' | 'remote';

export interface FoliageReport {
  id: string;
  locationId: string;
  /** ISO timestamp */
  observedAt: string;
  colorPercent: number;
  status: FoliageStatus;
  note?: string;
  /** Data URL or remote URL. */
  photo?: string;
  source: ReportSource;
}

export interface SeasonWindow {
  /** When to start showing "season is coming" messaging. */
  preseasonStart: MonthDay;
  /** First day treated as active foliage season. */
  seasonStart: MonthDay;
  /** Last day treated as active foliage season. */
  seasonEnd: MonthDay;
}

export interface MapTown {
  name: string;
  latitude: number;
  longitude: number;
  /** Larger cities get bolder labels. */
  major?: boolean;
}

export interface MapRoad {
  name: string;
  kind: 'interstate' | 'highway';
  /** [longitude, latitude] pairs */
  points: [number, number][];
}

export interface MapRange {
  name: string;
  /** [longitude, latitude] pairs forming a closed-ish ridge polygon */
  points: [number, number][];
}

export interface RegionMap {
  bounds: { west: number; east: number; south: number; north: number };
  towns: MapTown[];
  roads: MapRoad[];
  ranges: MapRange[];
  /** Polygon for the region outline, [lng, lat] */
  outline: [number, number][];
}

export interface StartPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Region {
  id: string;
  name: string;
  shortName: string;
  season: SeasonWindow;
  defaultStart: StartPoint;
  startPoints: StartPoint[];
  locations: FoliageLocation[];
  map: RegionMap;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}
