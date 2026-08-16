/**
 * Input adapters: text back to a {@link TimeValue}.
 *
 * The digital fields let people type, and people type `9`, `۹:۵`, `09:05 PM`,
 * `۲۱:۳۰ ب.ظ` and `9.30`. All of it has to land on the same value or the field
 * fights the user. Parsing is therefore deliberately permissive about *shape*
 * and strict about *range*: anything structurally recognisable is accepted,
 * anything out of range is rejected rather than silently wrapped.
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
   * Assume this half of the day when the text has no meridiem marker and the
   * hour is 1–12. Without it, a bare `9` is read as 09:00 — which is right for
   * a 24-hour field and wrong for a 12-hour one sitting on ب.ظ.
   */
  meridiem?: Meridiem;
}

/**
 * Parse a time, or return `null` when the text is not one.
 *
 * `null` rather than a thrown error, and rather than a "best effort" value: a
 * half-typed `1` in a field must not be turned into `01:00` while the user is
 * still typing the `4` of `14`. Callers decide when input is final.
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

  // Strip the meridiem marker, fold digits, then keep only what could be a
  // number or a separator — this is what makes `۰۹:۰۵ ب.ظ` and `9.5 pm` equal.
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

  // With an explicit meridiem the hour must be a 12-hour reading; without one
  // it is taken at face value, so `21:30` in a 24-hour field parses unchanged.
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
 * Parse a single field (an hour, a minute or a second box) to a number.
 *
 * Returns `null` for anything that is not digits, including the empty string —
 * an empty box is "still being typed", not "zero", and must not stomp the value
 * behind it.
 */
export function parseField(input: string): number | null {
  const cleaned = toLatinDigits(input).trim();
  if (cleaned === '' || !/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}
