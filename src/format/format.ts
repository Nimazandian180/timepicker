/**
 * Output adapters: turn a {@link TimeValue} into something else. The mirror of
 * the date picker's `format/convert.ts`, and the only place display decisions
 * (12h vs 24h, Persian vs Latin digits, padded vs bare) are made.
 */
import {
  DURATION_LABELS,
  MERIDIEM_LABELS,
  MINUTES_PER_HOUR,
} from '../core/constants';
import {
  durationToMinutes,
  meridiemOf,
  to12Hour,
  toMinutes,
  toSeconds,
} from '../core/time';
import type {
  DurationValue,
  TimeFormat,
  TimeRange,
  TimeValue,
} from '../core/types';
import { pad2, toPersianDigits } from './digits';

export interface TimeFormatOptions {
  /** 12-hour with a ق.ظ/ب.ظ suffix, or 24-hour. Default `'24h'`. */
  format?: TimeFormat;
  /** Include the seconds field. Default `false`. */
  showSeconds?: boolean;
  /** Pad a single-digit hour: `09:05` vs `9:05`. Default `true`. */
  leadingZero?: boolean;
  /** Render digits as ۰–۹ rather than 0–9. Default `true`. */
  persianDigits?: boolean;
  /** Include the ق.ظ/ب.ظ suffix in 12-hour mode. Default `true`. */
  showMeridiem?: boolean;
}

/**
 * A time as text: `۱۰:۳۰ ق.ظ`, `22:30`, `09:05:07`.
 *
 * The separator is a plain colon in both directions. Under `dir="rtl"` the
 * browser's bidi algorithm already renders `10:30` left-to-right as a numeric
 * run, so nothing here needs to reverse anything — and doing so manually is the
 * classic way to end up with a time that reads backwards on one platform.
 */
export function formatTime(
  value: TimeValue,
  options: TimeFormatOptions = {},
): string {
  const {
    format = '24h',
    showSeconds = false,
    leadingZero = true,
    persianDigits = true,
    showMeridiem = true,
  } = options;

  const hour = format === '12h' ? to12Hour(value.hour) : value.hour;
  const parts = [pad2(hour, leadingZero), pad2(value.minute)];
  if (showSeconds) parts.push(pad2(value.second));

  const text = parts.join(':');
  const digits = persianDigits ? toPersianDigits(text) : text;

  if (format === '12h' && showMeridiem) {
    return `${digits} ${MERIDIEM_LABELS[meridiemOf(value)]}`;
  }
  return digits;
}

/** A range as `۰۹:۰۰ – ۱۷:۳۰`. An open range renders its start and a dash. */
export function formatTimeRange(
  value: TimeRange,
  options: TimeFormatOptions = {},
): string {
  const start = formatTime(value.start, options);
  const end = value.end ? formatTime(value.end, options) : '—';
  // U+2013 en dash with thin spaces, matching the date picker's year-range label.
  return `${start} – ${end}`;
}

/**
 * A duration as `۱ ساعت و ۳۰ دقیقه`, or `۱:۳۰` when `compact`.
 *
 * A zero-hour duration drops the hours entirely rather than printing «۰ ساعت»,
 * and likewise for minutes — `۲ ساعت` reads better than `۲ ساعت و ۰ دقیقه`.
 */
export function formatDuration(
  value: DurationValue,
  options: TimeFormatOptions & { compact?: boolean } = {},
): string {
  const { persianDigits = true, compact = false } = options;
  const digits = (input: string | number) =>
    persianDigits ? toPersianDigits(input) : String(input);

  if (compact) {
    return `${digits(value.hours)}:${digits(pad2(value.minutes))}`;
  }

  const parts: string[] = [];
  if (value.hours > 0) {
    parts.push(`${digits(value.hours)} ${DURATION_LABELS.hours}`);
  }
  if (value.minutes > 0 || parts.length === 0) {
    parts.push(`${digits(value.minutes)} ${DURATION_LABELS.minutes}`);
  }
  return parts.join(' و ');
}

/** Minutes since midnight — the numeric form most back-ends want. */
export function toMinutesOfDay(value: TimeValue): number {
  return toMinutes(value);
}

/** Seconds since midnight. */
export function toSecondsOfDay(value: TimeValue): number {
  return toSeconds(value);
}

/**
 * Apply a time to a `Date`, returning a new one.
 *
 * The date part comes from `on` (today when omitted) and is left untouched;
 * only the clock fields are written. Nothing in this package stores a `Date` —
 * this exists purely so a consumer can hand one to an API that demands it.
 */
export function toDate(value: TimeValue, on: Date = new Date()): Date {
  const result = new Date(on.getTime());
  result.setHours(value.hour, value.minute, value.second, 0);
  return result;
}

/** Read the clock fields off a `Date`. The date part is discarded. */
export function fromDate(date: Date): TimeValue {
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

/** An `HH:mm` / `HH:mm:ss` string, always Latin digits and always 24-hour. */
export function toISOTime(value: TimeValue, showSeconds = false): string {
  const parts = [pad2(value.hour), pad2(value.minute)];
  if (showSeconds) parts.push(pad2(value.second));
  return parts.join(':');
}

/** A duration as total minutes, for storage. */
export function durationToTotalMinutes(value: DurationValue): number {
  return durationToMinutes(value);
}

/** `1h 30m` in Latin, for logs and non-Persian surfaces. */
export function formatDurationISO(value: DurationValue): string {
  const hours = Math.floor(durationToMinutes(value) / MINUTES_PER_HOUR);
  const minutes = durationToMinutes(value) % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
