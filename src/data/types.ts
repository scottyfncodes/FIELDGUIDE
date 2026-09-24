export interface Spot { n: string; d: string }

export interface Area {
  label: string;
  lat: number;
  lon: number;
  brew?: Spot[];
  eat?: Spot[];
}

export interface Trail {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  th: string;
  vehicle: string;
  vroad?: string;
  mi: number;
  rtMi?: number;
  type: string;
  diff: string;
  views: number;
  gain: number;
  gainR?: string;
  arrive?: string;
  prime: string;
  avoid?: string;
}

export interface Region {
  key: string;
  label: string;
  /** compact name for the map badges */
  short: string;
  areas: string[];
}

export interface StartPoint {
  key: string;
  label: string;
  lat: number;
  lon: number;
}

export interface Weather {
  hi: number;
  lo: number;
  wind: number;
  precip: number;
  summary: string;
}

export type Verdict = "GOOD" | "FAIR" | "POOR";

export interface LogEntry {
  done?: boolean;
  rating?: number;
  notes?: string;
}
export type Log = Record<string, LogEntry>;
