/**
 * Input adapters: text back to a {@link TimeValue}.
 *
 * People type `9`, `۹:۵`, `09:05 PM`, `۲۱:۳۰ ب.ظ` and `9.30`, and all of it has
 * to land on the same value. Permissive about shape, strict about range.
 */
import { HOURS_PER_DAY, MINUTES_PER_HOUR } from '../core/constants';
import { from12Hour } from '../core/time';
import type { Meridiem, TimeValue } from '../core/types';
import { toLatinDigits } from './digits';

/** `ق.ظ`, `ق ظ`, `AM`, `a.m.` … and the ب.ظ/PM equivalents. */
const AM_PATTERN = /(ق\s*\.?\s*ظ|قبل\s*از\s*ظهر|a\.?\s*m\.?)/i;
const PM_PATTERN = /(ب\s*\.?\s*ظ|بعد\s*از\s*ظهر|p\.?\s*m\.?)/i;

/** Any of the separators a person might reach for between the fields. */
const SEPARATOR = /[:.،,\s]+/;

export interface ParseTimeOptions {
  /**
   * Assumed half of the day when the text carries no marker. Without it a bare
   * `9` reads as 09:00 — right for a 24-hour field, wrong for a 12-hour one.
   */
  meridiem?: Meridiem;
}

/**
 * Parse a time, or `null` when the text is not one — never a best guess, so a
 * half-typed `1` is not turned into `01:00` mid-keystroke.
 */
export function parseTime(
  input: string,
  options: ParseTimeOptions = {},
): TimeValue | null {
  if (typeof input !== 'string') return null;

  const meridiem = AM_PATTERN.test(input)
    ? 'am'
    : PM_PATTERN.test(input)
      ? 'pm'
      : options.meridiem;

  // Strip the marker and fold digits, so `۰۹:۰۵ ب.ظ` and `9.5 pm` agree.
  const cleaned = toLatinDigits(input)
    .replace(AM_PATTERN, '')
    .replace(PM_PATTERN, '')
    .trim();

  if (cleaned === '') return null;

  const parts = cleaned.split(SEPARATOR).filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return null;
  if (parts.some((part) => !/^\d{1,2}$/.test(part))) {
    // A bare `0930` is a common shorthand; accept it only in that exact form.
    if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
      parts.splice(0, 1, parts[0].slice(0, 2), parts[0].slice(2));
    } else {
      return null;
    }
  }

  const [rawHour, rawMinute = '0', rawSecond = '0'] = parts;
  const hour12 = Number(rawHour);
  const minute = Number(rawMinute);
  const second = Number(rawSecond);

  if (!Number.isInteger(minute) || minute >= MINUTES_PER_HOUR) return null;
  if (!Number.isInteger(second) || second >= 60) return null;

  // With a meridiem the hour is a 12-hour reading; without one, face value.
  const hour = meridiem
    ? hour12 >= 1 && hour12 <= 12
      ? from12Hour(hour12, meridiem)
      : hour12 < HOURS_PER_DAY
        ? hour12 // already 24-hour, e.g. «۲۱:۳۰ ب.ظ» — trust the number
        : -1
    : hour12;

  if (hour < 0 || hour >= HOURS_PER_DAY) return null;

  return { hour, minute, second };
}

/** True when `input` parses to a real time. */
export function isValidTime(
  input: string,
  options?: ParseTimeOptions,
): boolean {
  return parseTime(input, options) !== null;
}

/**
 * Parse one field box to a number. `null` for anything non-numeric, including
 * empty — an empty box is "still being typed", not "zero".
 */
export function parseField(input: string): number | null {
  const cleaned = toLatinDigits(input).trim();
  if (cleaned === '' || !/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}
