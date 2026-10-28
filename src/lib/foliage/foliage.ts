/* Ported verbatim from Leaf Hunter (scottyfncodes/Leaf-Hunter, src/domain). Tests in tests/unit/foliage.test.ts. */
import type { FoliageLocation, FoliageReport, FoliageStatus, TypicalWindow } from './types';
import { addDays, daysBetween, monthDayForSeason, startOfDay } from './dates';

/**
 * Foliage status model.
 *
 * Deliberately simple and transparent: a location's estimated color follows a
 * curve anchored on its typical peak window. Recent reports override the
 * estimate. Nothing here claims to be a scientific forecast; the UI should
 * always describe results as estimates.
 */

export const STATUS_ORDER: FoliageStatus[] = ['early', 'turning', 'peak', 'past'];

export interface StatusMeta {
  status: FoliageStatus;
  label: string;
  short: string;
  description: string;
}

export const STATUS_META: Record<FoliageStatus, StatusMeta> = {
  early: {
    status: 'early',
    label: 'Early',
    short: 'Mostly green',
    description: 'Mostly green. A few hints of yellow at the edges.',
  },
  turning: {
    status: 'turning',
    label: 'Turning',
    short: 'Color building',
    description: 'Visible yellow and orange spreading through the groves.',
  },
  peak: {
    status: 'peak',
    label: 'Peak',
    short: 'Best color now',
    description: 'Best current color conditions. Go.',
  },
  past: {
    status: 'past',
    label: 'Past Peak',
    short: 'Fading',
    description: 'Color has passed its best point. Leaves are dropping.',
  },
};

/** Threshold-based conversion when we only know a percentage. */
export function statusFromPercent(percent: number, opts: { pastPeak?: boolean } = {}): FoliageStatus {
  if (opts.pastPeak) return 'past';
  const p = clampPercent(percent);
  if (p < 25) return 'early';
  if (p < 70) return 'turning';
  return 'peak';
}

export function clampPercent(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, Math.round(p)));
}

/** Days before typical peak when color starts becoming visible. */
export const RAMP_DAYS = 24;
/** Days after typical peak end until leaves are mostly down. */
export const DROP_DAYS = 14;

export interface Estimate {
  status: FoliageStatus;
  colorPercent: number;
  /** Days until typical peak starts (negative when already started). */
  daysToPeak: number;
  /** Days until typical peak ends (negative when already past). */
  daysToPeakEnd: number;
  peakStart: Date;
  peakEnd: Date;
}

/**
 * Deterministic estimate of color for a typical year.
 * Curve: 0% at (peakStart - RAMP_DAYS), eases up to ~90% at peakStart,
 * ~95% mid-window, then drops after peakEnd to ~0% at (peakEnd + DROP_DAYS).
 */
export function estimateFromTypical(typical: TypicalWindow, date: Date): Estimate {
  const day = startOfDay(date);
  const peakStart = startOfDay(monthDayForSeason(typical.peakStart, day));
  const peakEnd = startOfDay(monthDayForSeason(typical.peakEnd, day));
  const daysToPeak = daysBetween(day, peakStart);
  const daysToPeakEnd = daysBetween(day, peakEnd);

  let colorPercent: number;
  let status: FoliageStatus;

  if (daysToPeak > RAMP_DAYS) {
    colorPercent = Math.max(0, Math.round(6 - (daysToPeak - RAMP_DAYS) * 0.5));
    status = 'early';
  } else if (daysToPeak > 0) {
    // Ease-in ramp from ~6% to ~82% across RAMP_DAYS. Before the typical
    // window opens we call it "turning" at most, even at high percentages.
    const t = 1 - daysToPeak / RAMP_DAYS; // 0..1
    const eased = t * t * (3 - 2 * t);
    colorPercent = Math.round(6 + eased * 76);
    status = colorPercent < 25 ? 'early' : 'turning';
  } else if (daysToPeakEnd >= 0) {
    const span = Math.max(1, daysBetween(peakStart, peakEnd));
    const t = (-daysToPeak) / span; // 0..1 across the window
    colorPercent = Math.round(88 + Math.sin(t * Math.PI) * 8);
    status = 'peak';
  } else {
    const since = -daysToPeakEnd;
    const t = Math.min(1, since / DROP_DAYS);
    colorPercent = Math.round(85 * (1 - t) * (1 - t * 0.4));
    status = 'past';
  }

  return { status, colorPercent: clampPercent(colorPercent), daysToPeak, daysToPeakEnd, peakStart, peakEnd };
}

export type Confidence = 'high' | 'medium' | 'low';

export interface Condition extends Estimate {
  locationId: string;
  /** Where the current numbers came from. */
  basis: 'report' | 'typical';
  latestReport?: FoliageReport;
  confidence: Confidence;
  /** Estimated peak start, adjusted when reports run ahead/behind typical. */
  estimatedPeakStart: Date;
  estimatedPeakEnd: Date;
  /** Human phrase like "Peak soon", "Peak now", "Fading". */
  timing: 'peak-now' | 'peak-soon' | 'later' | 'fading' | 'done';
}

const REPORT_FRESH_DAYS = 7;

/**
 * Current condition for a location: recent reports win, otherwise typical timing.
 * A fresh report nudges the estimated peak window earlier or later.
 */
export function deriveCondition(location: FoliageLocation, reports: FoliageReport[], now: Date): Condition {
  const base = estimateFromTypical(location.typical, now);
  const fresh = reports
    .filter((r) => r.locationId === location.id)
    .filter((r) => daysBetween(new Date(r.observedAt), now) <= REPORT_FRESH_DAYS && daysBetween(new Date(r.observedAt), now) >= 0)
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());

  const latest = fresh[0];
  if (!latest) {
    return {
      ...base,
      locationId: location.id,
      basis: 'typical',
      confidence: 'low',
      estimatedPeakStart: base.peakStart,
      estimatedPeakEnd: base.peakEnd,
      timing: timingFor(base.status, base.daysToPeak, base.daysToPeakEnd),
    };
  }

  const ageDays = daysBetween(new Date(latest.observedAt), now);
  const confidence: Confidence = ageDays <= 2 && fresh.length >= 2 ? 'high' : ageDays <= 4 ? 'medium' : 'low';

  // Compare report to the typical curve at the observation date to see if this year is running ahead/behind.
  const typicalAtObs = estimateFromTypical(location.typical, new Date(latest.observedAt));
  const shiftDays = shiftFromDifference(latest.colorPercent, typicalAtObs.colorPercent, latest.status, typicalAtObs.status);
  const estimatedPeakStart = addDays(base.peakStart, shiftDays);
  const estimatedPeakEnd = addDays(base.peakEnd, shiftDays);
  const daysToPeak = daysBetween(startOfDay(now), estimatedPeakStart);
  const daysToPeakEnd = daysBetween(startOfDay(now), estimatedPeakEnd);

  return {
    ...base,
    status: latest.status,
    colorPercent: clampPercent(latest.colorPercent),
    daysToPeak,
    daysToPeakEnd,
    locationId: location.id,
    basis: 'report',
    latestReport: latest,
    confidence,
    estimatedPeakStart,
    estimatedPeakEnd,
    timing: timingFor(latest.status, daysToPeak, daysToPeakEnd),
  };
}

/** Rough conversion: every ~4 points of color difference ≈ one day ahead/behind. Capped. */
function shiftFromDifference(reported: number, typical: number, rs: FoliageStatus, ts: FoliageStatus): number {
  if (rs === 'past' && ts !== 'past') return -5;
  if (rs !== 'past' && ts === 'past') return 5;
  const diff = reported - typical;
  const days = -Math.round(diff / 4);
  return Math.max(-10, Math.min(10, days));
}

export function timingFor(status: FoliageStatus, daysToPeak: number, daysToPeakEnd: number): Condition['timing'] {
  if (status === 'past') return daysToPeakEnd < -DROP_DAYS ? 'done' : 'fading';
  if (status === 'peak') return 'peak-now';
  if (daysToPeak <= 10) return 'peak-soon';
  return 'later';
}

export const TIMING_LABEL: Record<Condition['timing'], string> = {
  'peak-now': 'Peak now',
  'peak-soon': 'Peak soon',
  later: 'Later',
  fading: 'Fading',
  done: 'Leaves down',
};

/** Compact arrow phrase for cards, e.g. "Turning → Peak soon". */
export function statusArrow(c: Condition): string {
  const meta = STATUS_META[c.status];
  if (c.status === 'turning' && c.timing === 'peak-soon') return `${meta.label} → Peak soon`;
  if (c.status === 'early' && c.timing === 'peak-soon') return `${meta.label} → Turning soon`;
  if (c.status === 'peak') return 'Peak color now';
  if (c.status === 'past') return c.timing === 'done' ? 'Past peak · leaves down' : 'Past peak · fading';
  return meta.label;
}

export function reportsForLocation(reports: FoliageReport[], locationId: string): FoliageReport[] {
  return reports
    .filter((r) => r.locationId === locationId)
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
}
