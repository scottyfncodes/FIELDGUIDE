/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
/**
 * Shared domain types. The rule that shapes everything: a computed fact, a
 * forecast, a sourced record and a guess are different things, and nothing in
 * LOOKUP is allowed to blur them.
 */

/** Where a value came from. Rendered next to the value, never hidden. */
export type Confidence =
  | 'computed' // astronomy: a deterministic calculation from time and place
  | 'forecast' // a weather or space-weather model output
  | 'official' // a published designation or record
  | 'estimate' // LOOKUP's own estimate, labelled as such
  | 'user'; // the user typed it

export interface Source {
  label: string;
  url?: string;
  confidence: Confidence;
  /** ISO date the record was last checked against its source. */
  checked?: string;
}

/**
 * A physical measurement: a single figure, a range when credible sources
 * disagree, or null when nobody credible said. Null renders as UNKNOWN.
 */
export type Measure = number | { min: number; max: number } | null;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Place extends LatLon {
  name: string;
  /** Metres above sea level, when known. */
  elevationM?: Measure;
  timezone?: string;
}

export function measureMid(m: Measure): number | null {
  if (m == null) return null;
  return typeof m === 'number' ? m : (m.min + m.max) / 2;
}

export function measureText(m: Measure, unit = '', digits = 0): string {
  if (m == null) return 'UNKNOWN';
  const f = (n: number) => n.toFixed(digits);
  if (typeof m === 'number') return `${f(m)}${unit}`;
  return `${f(m.min)}–${f(m.max)}${unit}`;
}
