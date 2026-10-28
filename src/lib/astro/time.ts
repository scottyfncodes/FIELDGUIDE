/* Ported verbatim from LOOKUP (scottyfncodes/LOOKUP, src/core). Keep in sync; tests in tests/unit/astro.test.ts. */
/** Wall-clock helpers. Instants are epoch ms or Julian Days; only rendering and user input touch local time. */

export interface LocalParts {
  year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localParts(ms: number, tz: string): LocalParts {
  const parts = fmt(tz).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  return {
    year: +get('year'), month: +get('month'), day: +get('day'),
    hour: +get('hour') % 24, minute: +get('minute'), second: +get('second'),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  };
}

/** Offset of tz from UTC at the given instant, in ms (positive east). */
export function tzOffsetMs(ms: number, tz: string): number {
  const p = localParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Instant (epoch ms) for a wall-clock time in tz. Handles DST transitions by re-checking the offset. */
export function zonedToUtc(year: number, month: number, day: number, hour = 0, minute = 0, tz = 'UTC'): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let off = tzOffsetMs(guess, tz);
  let result = guess - off;
  const off2 = tzOffsetMs(result, tz);
  if (off2 !== off) result = guess - off2;
  return result;
}

export interface LocalDate { year: number; month: number; day: number }

export function localDateOf(ms: number, tz: string): LocalDate {
  const p = localParts(ms, tz);
  return { year: p.year, month: p.month, day: p.day };
}

export function addDays(d: LocalDate, n: number): LocalDate {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function dateKey(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export function parseDateKey(s: string): LocalDate {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function weekdayOf(d: LocalDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

export function fmtTime(ms: number | null, tz: string): string {
  if (ms == null || !Number.isFinite(ms)) return '–';
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
}

export function fmtDay(d: LocalDate, style: 'short' | 'long' = 'short'): string {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day, 12));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: style === 'long' ? 'long' : 'short', month: 'short', day: 'numeric',
  }).format(t);
}

export function fmtDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}
