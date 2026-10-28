/* Ported verbatim from Leaf Hunter (scottyfncodes/Leaf-Hunter, src/domain). Tests in tests/unit/foliage.test.ts. */
import type { MonthDay } from './types';

export const DAY_MS = 86_400_000;

/** Resolve a month-day marker to a Date in the given year (local time, noon to dodge DST edges). */
export function monthDayInYear(md: MonthDay, year: number): Date {
  const [m, d] = md.split('-').map(Number);
  return new Date(year, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/**
 * Resolve a month-day marker to the occurrence that belongs to the same
 * foliage season as `reference`. Seasons live in a single calendar year for
 * Northern Hemisphere fall, so this simply uses the reference year.
 */
export function monthDayForSeason(md: MonthDay, reference: Date): Date {
  return monthDayInYear(md, reference.getFullYear());
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(date: Date): string {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatMonthDay(md: MonthDay, reference: Date): string {
  return formatShortDate(monthDayForSeason(md, reference));
}

export function formatRange(start: MonthDay, end: MonthDay, reference: Date): string {
  const s = monthDayForSeason(start, reference);
  const e = monthDayForSeason(end, reference);
  if (s.getMonth() === e.getMonth()) {
    return `${SHORT_MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
  }
  return `${formatShortDate(s)} – ${formatShortDate(e)}`;
}

/** "today", "yesterday", "3 days ago", "2 weeks ago" */
export function formatRelative(from: Date, now: Date): string {
  const days = daysBetween(startOfDay(from), startOfDay(now));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

/** "in 3 days", "this week", "next week", "in 3 weeks" */
export function formatUntil(target: Date, now: Date): string {
  const days = daysBetween(startOfDay(now), startOfDay(target));
  if (days <= 0) return 'now';
  if (days === 1) return 'tomorrow';
  if (days <= 4) return `in ${days} days`;
  if (days <= 7) return 'this week';
  if (days <= 14) return 'next week';
  const weeks = Math.round(days / 7);
  return `in ${weeks} weeks`;
}
