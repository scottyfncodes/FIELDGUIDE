import { describe, expect, it } from 'vitest';
import { gmst, toJD, fromJD, meanObliquity, J2000 } from '../../src/lib/astro/julian';
import { sunPosition, sunAltAz } from '../../src/lib/astro/sun';
import { moonEclipticTT, moonPosition, nextPhase, phaseName } from '../../src/lib/astro/moon';
import { planetPosition } from '../../src/lib/astro/planets';
import { sunTimesForNight, moonTimes, crossings } from '../../src/lib/astro/events';
import { compass, separation, toHorizontal } from '../../src/lib/astro/coords';
import { galacticCenterAltAz } from '../../src/lib/astro/galactic';

const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi, s));
const DENVER = { lat: 39.7392, lon: -104.9903 };

describe('time scales', () => {
  it('J2000.0 is 2000-01-01 12:00 UTC (TT ≈ UT for this purpose)', () => {
    expect(toJD(utc(2000, 1, 1, 12))).toBeCloseTo(J2000, 6);
    expect(fromJD(J2000).toISOString()).toBe('2000-01-01T12:00:00.000Z');
  });
  it('GMST at J2000.0 is 18h 41m 50.548s', () => {
    const expected = (18 + 41 / 60 + 50.548 / 3600) * 15;
    expect(gmst(J2000)).toBeCloseTo(expected, 3);
  });
  it('Meeus 12.a: GMST on 1987 April 10 0h UT is 13h 10m 46.3668s', () => {
    const expected = (13 + 10 / 60 + 46.3668 / 3600) * 15;
    expect(gmst(2446895.5)).toBeCloseTo(expected, 3);
  });
  it('mean obliquity near J2000 is 23.4393°', () => {
    expect(meanObliquity(J2000)).toBeCloseTo(23.4392911, 4);
  });
});

describe('sun', () => {
  it('Meeus 25.a: 1992 Oct 13 0h — apparent RA 198.38083°, Dec −7.78507°', () => {
    const s = sunPosition(2448908.5);
    expect(s.lon).toBeCloseTo(199.90895, 2);
    expect(s.ra).toBeCloseTo(198.38083, 2);
    expect(s.dec).toBeCloseTo(-7.78507, 2);
    expect(s.distanceAU).toBeCloseTo(0.99766, 4);
  });
  it('declination is ~0 at the March 2024 equinox (03:06 UTC on the 20th)', () => {
    expect(Math.abs(sunPosition(toJD(utc(2024, 3, 20, 3, 6))).dec)).toBeLessThan(0.01);
  });
  it('declination is ~+23.44 at the June 2024 solstice', () => {
    expect(sunPosition(toJD(utc(2024, 6, 20, 20, 51))).dec).toBeCloseTo(23.436, 2);
  });
  it('is up at Denver noon and down at Denver midnight', () => {
    expect(sunAltAz(toJD(utc(2026, 9, 26, 19)), DENVER.lat, DENVER.lon).alt).toBeGreaterThan(40);
    expect(sunAltAz(toJD(utc(2026, 9, 27, 7)), DENVER.lat, DENVER.lon).alt).toBeLessThan(-30);
  });
});

describe('moon', () => {
  it('Meeus 47.a: 1992 April 12 0h TD — λ 133.162655°, β −3.229126°, Δ 368409.7 km', () => {
    const m = moonEclipticTT(2448724.5);
    expect(m.lon).toBeCloseTo(133.162655, 3);
    expect(m.lat).toBeCloseTo(-3.229126, 3);
    expect(m.distanceKm).toBeCloseTo(368409.7, 0);
  });
  it('Meeus 47.a: apparent RA 134.688470°, Dec +13.768368°', () => {
    // moonPosition takes UT; undo ΔT (≈58.6 s in 1992) so the instant is 0h TD.
    const jdUT = 2448724.5 - 58.6 / 86400;
    const m = moonPosition(jdUT);
    expect(m.ra).toBeCloseTo(134.68847, 2);
    expect(m.dec).toBeCloseTo(13.768368, 2);
  });
  it('is new during the 2024 April 8 total solar eclipse (18:18 UTC)', () => {
    const m = moonPosition(toJD(utc(2024, 4, 8, 18, 18)));
    expect(m.illumination).toBeLessThan(0.002);
    expect(m.elongation).toBeLessThan(1.5);
    expect(phaseName(m.phaseAngle)).toBe('New Moon');
  });
  it('is full on 2024 Jan 25 (17:54 UTC)', () => {
    const m = moonPosition(toJD(utc(2024, 1, 25, 17, 54)));
    expect(m.illumination).toBeGreaterThan(0.995);
    expect(phaseName(m.phaseAngle)).toBe('Full Moon');
  });
  it('finds the next new moon after 2024 March 20 at 2024 April 8 ~18:21 UTC', () => {
    const jd = nextPhase(toJD(utc(2024, 3, 20)), 0);
    const when = fromJD(jd);
    const target = utc(2024, 4, 8, 18, 21).getTime();
    expect(Math.abs(when.getTime() - target)).toBeLessThan(15 * 60 * 1000);
  });
  it('finds the full moon after 2024 Jan 1 at 2024 Jan 25 ~17:54 UTC', () => {
    const when = fromJD(nextPhase(toJD(utc(2024, 1, 1)), 180));
    expect(Math.abs(when.getTime() - utc(2024, 1, 25, 17, 54).getTime())).toBeLessThan(15 * 60 * 1000);
  });
});

describe('planets', () => {
  it('Jupiter near opposition 2024 Dec 7 sits in Taurus (RA ~4.9h, Dec ~+22°) opposite the Sun', () => {
    const p = planetPosition('jupiter', toJD(utc(2024, 12, 7)));
    expect(p.ra / 15).toBeGreaterThan(4.5);
    expect(p.ra / 15).toBeLessThan(5.3);
    expect(p.dec).toBeGreaterThan(20);
    expect(p.dec).toBeLessThan(24);
    expect(p.elongation).toBeGreaterThan(176);
  });
  it('Saturn near opposition 2024 Sep 8 sits in Aquarius (RA ~23h, Dec ~−8°)', () => {
    const p = planetPosition('saturn', toJD(utc(2024, 9, 8)));
    expect(p.ra / 15).toBeGreaterThan(22.6);
    expect(p.ra / 15).toBeLessThan(23.4);
    expect(p.dec).toBeGreaterThan(-10);
    expect(p.dec).toBeLessThan(-6);
    expect(p.elongation).toBeGreaterThan(176);
  });
  it('Venus never strays beyond ~48° from the Sun', () => {
    for (let d = 0; d < 600; d += 7) {
      expect(planetPosition('venus', J2000 + d).elongation).toBeLessThan(48.5);
    }
  });
  it('Mars at its 2025 Jan 16 opposition is in Gemini (RA ~7.9h, Dec ~+25°)', () => {
    const p = planetPosition('mars', toJD(utc(2025, 1, 16)));
    expect(p.ra / 15).toBeGreaterThan(7.5);
    expect(p.ra / 15).toBeLessThan(8.3);
    expect(p.dec).toBeGreaterThan(23);
    expect(p.dec).toBeLessThan(27);
  });
});

describe('horizon events', () => {
  it('Denver sunset on 2026 Sep 26 is about 18:52 MDT (00:52 UTC), sunrise about 06:53 MDT', () => {
    // Local noon in Denver ≈ 19:00 UTC.
    const t = sunTimesForNight(toJD(utc(2026, 9, 26, 19)), DENVER.lat, DENVER.lon);
    expect(t.sunset).not.toBeNull();
    expect(t.sunrise).not.toBeNull();
    const sunset = fromJD(t.sunset!);
    const sunrise = fromJD(t.sunrise!);
    expect(Math.abs(sunset.getTime() - utc(2026, 9, 27, 0, 52).getTime())).toBeLessThan(6 * 60 * 1000);
    expect(Math.abs(sunrise.getTime() - utc(2026, 9, 27, 12, 53).getTime())).toBeLessThan(6 * 60 * 1000);
    // Twilights come in order and astronomical dark is roughly 90 minutes after sunset at this latitude.
    expect(t.civilDusk!).toBeGreaterThan(t.sunset!);
    expect(t.nauticalDusk!).toBeGreaterThan(t.civilDusk!);
    expect(t.astroDusk!).toBeGreaterThan(t.nauticalDusk!);
    expect((t.astroDusk! - t.sunset!) * 1440).toBeGreaterThan(75);
    expect((t.astroDusk! - t.sunset!) * 1440).toBeLessThan(100);
    expect(t.astroDawn!).toBeLessThan(t.sunrise!);
  });
  it('Tromsø in late June has no astronomical night at all', () => {
    const t = sunTimesForNight(toJD(utc(2026, 6, 21, 11)), 69.65, 18.96);
    expect(t.sunset).toBeNull();
    expect(t.astroDusk).toBeNull();
  });
  it('on the 2024 Jan 25 full-moon night in Denver the Moon rises near sunset and sets near sunrise', () => {
    const start = toJD(utc(2024, 1, 25, 19));
    const m = moonTimes(start, start + 1, DENVER.lat, DENVER.lon);
    const s = sunTimesForNight(start, DENVER.lat, DENVER.lon);
    expect(m.rises.length).toBe(1);
    expect(m.sets.length).toBe(1);
    // Full at 10:54 MST, so by evening it is a few hours past full: rises just after sunset, sets after sunrise.
    expect((m.rises[0] - s.sunset!) * 1440).toBeGreaterThan(-15);
    expect((m.rises[0] - s.sunset!) * 1440).toBeLessThan(45);
    expect((m.sets[0] - s.sunrise!) * 1440).toBeGreaterThan(0);
    expect((m.sets[0] - s.sunrise!) * 1440).toBeLessThan(90);
  });
  it('crossings reports both directions in order', () => {
    const f = (jd: number) => Math.sin((jd - J2000) * 2 * Math.PI);
    const cs = crossings(f, J2000 + 0.1, J2000 + 1.1, 0, 30);
    expect(cs.map((c) => c.rising)).toEqual([false, true]);
    expect(cs[0].jd).toBeCloseTo(J2000 + 0.5, 4);
  });
});

describe('coordinates', () => {
  it('a star on the meridian at the observer latitude is at the zenith', () => {
    // Choose an instant and a longitude so LST equals the RA.
    const jd = J2000;
    const lonNeeded = 90 - gmst(jd); // LST = gmst + lon = 90
    const h = toHorizontal({ ra: 90, dec: 40 }, jd, 40, lonNeeded);
    expect(h.alt).toBeCloseTo(90, 3);
  });
  it('compass points', () => {
    expect(compass(0)).toBe('N');
    expect(compass(135)).toBe('SE');
    expect(compass(359)).toBe('N');
    expect(compass(202)).toBe('SSW');
  });
  it('separation between the celestial poles is 180°', () => {
    expect(separation({ ra: 0, dec: 90 }, { ra: 0, dec: -90 })).toBeCloseTo(180, 6);
  });
  it('the galactic core culminates about 21° up from Denver, in the south', () => {
    // Culmination when LST = 266.4°: pick lon so that at J2000 it holds.
    const lonNeeded = 266.417 - gmst(J2000);
    const h = galacticCenterAltAz(J2000, DENVER.lat, lonNeeded);
    expect(h.alt).toBeCloseTo(90 - DENVER.lat - 29.008, 1);
    expect(compass(h.az)).toBe('S');
  });
});
