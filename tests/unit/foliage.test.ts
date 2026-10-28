import { describe, expect, it } from 'vitest';
import { deriveCondition, estimateFromTypical, statusFromPercent, statusArrow, RAMP_DAYS, DROP_DAYS } from '../../src/lib/foliage/foliage';
import type { FoliageLocation, FoliageReport } from '../../src/lib/foliage/types';
import { addDays } from '../../src/lib/foliage/dates';

const loc: FoliageLocation = {
  id: 'test', regionId: 'colorado', name: 'Test Pass', town: 'Nowhere', area: 'Test', kind: 'pass',
  latitude: 39.5, longitude: -105.7, elevationFt: 10000, accessType: 'paved', activities: ['drive'],
  whyGo: [], summary: '', typical: { peakStart: '09-22', peakEnd: '10-03' }, corridor: 'test', visitMinutes: 60,
};

const d = (m: number, day: number) => new Date(2026, m - 1, day, 12);

describe('statusFromPercent', () => {
  it('maps percentages to statuses with clear thresholds', () => {
    expect(statusFromPercent(0)).toBe('early');
    expect(statusFromPercent(24)).toBe('early');
    expect(statusFromPercent(25)).toBe('turning');
    expect(statusFromPercent(69)).toBe('turning');
    expect(statusFromPercent(70)).toBe('peak');
    expect(statusFromPercent(100)).toBe('peak');
  });
  it('honours the past-peak flag regardless of percent', () => {
    expect(statusFromPercent(60, { pastPeak: true })).toBe('past');
  });
  it('clamps garbage input', () => {
    expect(statusFromPercent(-40)).toBe('early');
    expect(statusFromPercent(400)).toBe('peak');
    expect(statusFromPercent(Number.NaN)).toBe('early');
  });
});

describe('estimateFromTypical', () => {
  it('is fully green well before the ramp', () => {
    const e = estimateFromTypical(loc.typical, d(8, 1));
    expect(e.status).toBe('early');
    expect(e.colorPercent).toBe(0);
  });
  it('ramps up through turning before the peak window', () => {
    const early = estimateFromTypical(loc.typical, addDays(d(9, 22), -RAMP_DAYS + 3));
    const mid = estimateFromTypical(loc.typical, d(9, 12));
    const late = estimateFromTypical(loc.typical, d(9, 20));
    expect(early.status).toBe('early');
    expect(mid.status).toBe('turning');
    expect(late.colorPercent).toBeGreaterThan(mid.colorPercent);
    expect(mid.colorPercent).toBeGreaterThan(early.colorPercent);
  });
  it('is at peak inside the typical window', () => {
    const e = estimateFromTypical(loc.typical, d(9, 27));
    expect(e.status).toBe('peak');
    expect(e.colorPercent).toBeGreaterThanOrEqual(85);
    expect(e.daysToPeak).toBeLessThanOrEqual(0);
    expect(e.daysToPeakEnd).toBeGreaterThanOrEqual(0);
  });
  it('falls to past peak after the window and drops to zero', () => {
    const justAfter = estimateFromTypical(loc.typical, d(10, 5));
    const wayAfter = estimateFromTypical(loc.typical, addDays(d(10, 3), DROP_DAYS + 5));
    expect(justAfter.status).toBe('past');
    expect(justAfter.colorPercent).toBeLessThan(85);
    expect(wayAfter.status).toBe('past');
    expect(wayAfter.colorPercent).toBe(0);
  });
  it('uses the reference year so it works in any year', () => {
    const e = estimateFromTypical(loc.typical, new Date(2031, 8, 27, 12));
    expect(e.status).toBe('peak');
    expect(e.peakStart.getFullYear()).toBe(2031);
  });
});

describe('deriveCondition', () => {
  it('uses typical timing with low confidence when there are no reports', () => {
    const c = deriveCondition(loc, [], d(9, 27));
    expect(c.basis).toBe('typical');
    expect(c.confidence).toBe('low');
    expect(c.status).toBe('peak');
    expect(c.timing).toBe('peak-now');
  });
  it('prefers a fresh report and shifts the estimated peak window', () => {
    const now = d(9, 15);
    const report: FoliageReport = {
      id: 'r1', locationId: 'test', observedAt: addDays(now, -1).toISOString(), colorPercent: 82, status: 'peak', source: 'local',
    };
    const c = deriveCondition(loc, [report], now);
    expect(c.basis).toBe('report');
    expect(c.status).toBe('peak');
    expect(c.colorPercent).toBe(82);
    // Running ahead of typical → estimated peak start moves earlier.
    expect(c.estimatedPeakStart.getTime()).toBeLessThan(c.peakStart.getTime());
  });
  it('ignores stale reports', () => {
    const now = d(9, 27);
    const stale: FoliageReport = {
      id: 'r2', locationId: 'test', observedAt: addDays(now, -20).toISOString(), colorPercent: 5, status: 'early', source: 'local',
    };
    const c = deriveCondition(loc, [stale], now);
    expect(c.basis).toBe('typical');
    expect(c.status).toBe('peak');
  });
  it('ignores reports for other locations', () => {
    const now = d(9, 27);
    const other: FoliageReport = {
      id: 'r3', locationId: 'someone-else', observedAt: now.toISOString(), colorPercent: 5, status: 'early', source: 'local',
    };
    expect(deriveCondition(loc, [other], now).basis).toBe('typical');
  });
  it('raises confidence with multiple recent reports', () => {
    const now = d(9, 27);
    const reports: FoliageReport[] = [
      { id: 'a', locationId: 'test', observedAt: now.toISOString(), colorPercent: 90, status: 'peak', source: 'local' },
      { id: 'b', locationId: 'test', observedAt: addDays(now, -1).toISOString(), colorPercent: 85, status: 'peak', source: 'demo' },
    ];
    expect(deriveCondition(loc, reports, now).confidence).toBe('high');
  });
  it('labels turning spots that are close to peak as "Peak soon"', () => {
    const c = deriveCondition(loc, [], d(9, 16));
    expect(c.status).toBe('turning');
    expect(c.timing).toBe('peak-soon');
    expect(statusArrow(c)).toBe('Turning → Peak soon');
  });
});
