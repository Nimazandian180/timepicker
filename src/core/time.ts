/**
 * Pure time arithmetic. No React, no dayjs, no `Date` beyond reading the wall
 * clock in {@link nowTime} — everything else is integer maths on
 * {@link TimeValue}, which keeps it trivially testable and identical on a
 * server and in a browser.
 *
 * Every function here treats a time as "minutes (and seconds) since midnight".
 * That single representation is what makes comparison, clamping, snapping and
 * range logic one-liners instead of nested hour/minute special cases.
 */
import {
  HOURS_PER_DAY,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  SECONDS_PER_MINUTE,
} from './constants';
import type { DurationValue, Meridiem, TimeValue } from './types';

/** Integer floor division that also behaves for negatives. */
const floorDiv = (value: number, by: number): number => Math.floor(value / by);

/** Positive modulo — `-1 % 24` is `-1` in JS, which is never what a clock wants. */
const mod = (value: number, by: number): number => ((value % by) + by) % by;

/** Build a {@link TimeValue}, filling in the seconds nobody passed. */
export function time(hour: number, minute = 0, second = 0): TimeValue {
  return { hour, minute, second };
}

/** Midnight — the fallback the picker opens on when it has nothing else. */
export const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };

/**
 * Fold any hour/minute/second triple into a valid time, carrying overflow the
 * way a clock does: `{ hour: 10, minute: 75 }` becomes `11:15`, and the hour
 * wraps at 24 so `25:00` reads as `01:00`.
 *
 * This is what makes the digital inputs and the increment buttons safe: they
 * can produce nonsense freely and hand it here.
 */
export function normalizeTime(value: TimeValue): TimeValue {
  const totalSeconds =
    value.hour * MINUTES_PER_HOUR * SECONDS_PER_MINUTE +
    value.minute * SECONDS_PER_MINUTE +
    value.second;
  const wrapped = mod(
    totalSeconds,
    HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE,
  );
  return {
    hour: floorDiv(wrapped, MINUTES_PER_HOUR * SECONDS_PER_MINUTE),
    minute: mod(floorDiv(wrapped, SECONDS_PER_MINUTE), MINUTES_PER_HOUR),
    second: mod(wrapped, SECONDS_PER_MINUTE),
  };
}

/** Minutes since midnight, seconds discarded. */
export function toMinutes(value: TimeValue): number {
  return value.hour * MINUTES_PER_HOUR + value.minute;
}

/** Seconds since midnight — the comparison key when `showSeconds` is on. */
export function toSeconds(value: TimeValue): number {
  return toMinutes(value) * SECONDS_PER_MINUTE + value.second;
}

/** Inverse of {@link toMinutes}. */
export function fromMinutes(minutes: number): TimeValue {
  const wrapped = mod(minutes, MINUTES_PER_DAY);
  return {
    hour: floorDiv(wrapped, MINUTES_PER_HOUR),
    minute: wrapped % MINUTES_PER_HOUR,
    second: 0,
  };
}

/** Inverse of {@link toSeconds}. */
export function fromSeconds(seconds: number): TimeValue {
  return normalizeTime({ hour: 0, minute: 0, second: seconds });
}

/**
 * `-1`, `0` or `1`, ordering two times within a single day.
 *
 * Seconds count only when asked for: with `showSeconds` off, `10:30:45` and
 * `10:30:00` are the same time as far as the user is concerned, and a min/max
 * bound that ignored that would reject a value the UI cannot even express.
 */
export function compareTime(
  a: TimeValue,
  b: TimeValue,
  { seconds = true }: { seconds?: boolean } = {},
): number {
  const left = seconds ? toSeconds(a) : toMinutes(a);
  const right = seconds ? toSeconds(b) : toMinutes(b);
  return Math.sign(left - right);
}

/** True when both times are the same point in the day. */
export function isSameTime(
  a: TimeValue | null,
  b: TimeValue | null,
  options?: { seconds?: boolean },
): boolean {
  if (!a || !b) return a === b;
  return compareTime(a, b, options) === 0;
}

/** Stable string identity, handy as a React key or a memo dependency. */
export function timeKey(value: TimeValue | null): string {
  if (!value) return 'none';
  return `${value.hour}:${value.minute}:${value.second}`;
}

/** Hold a time inside `[min, max]`, leaving it alone when it already fits. */
export function clampTime(
  value: TimeValue,
  min: TimeValue | null | undefined,
  max: TimeValue | null | undefined,
): TimeValue {
  if (min && compareTime(value, min) < 0) return { ...min };
  if (max && compareTime(value, max) > 0) return { ...max };
  return value;
}

/** Add minutes (negative to subtract), wrapping around midnight. */
export function addMinutes(value: TimeValue, delta: number): TimeValue {
  return normalizeTime({ ...value, minute: value.minute + delta });
}

/** Add seconds (negative to subtract), wrapping around midnight. */
export function addSeconds(value: TimeValue, delta: number): TimeValue {
  return normalizeTime({ ...value, second: value.second + delta });
}

/**
 * Round a minute value to the nearest multiple of `interval`.
 *
 * `direction` exists because "nearest" is wrong in two places: dragging the
 * minute hand should round to nearest, but nudging a time up to satisfy a
 * `minTime` must always round *up*, or the clamp would land back outside the
 * bound it was trying to enter.
 *
 * Snapping to 60 wraps to the next hour, which is why the result goes through
 * {@link normalizeTime} rather than being written back directly.
 */
export function snapMinute(
  value: TimeValue,
  interval: number,
  direction: 'nearest' | 'up' | 'down' = 'nearest',
): TimeValue {
  if (!Number.isFinite(interval) || interval <= 1) return value;
  const round =
    direction === 'up'
      ? Math.ceil
      : direction === 'down'
        ? Math.floor
        : Math.round;
  const snapped = round(value.minute / interval) * interval;
  return normalizeTime({ ...value, minute: snapped, second: 0 });
}

/** True when `minute` sits exactly on the configured grid. */
export function isOnInterval(minute: number, interval: number): boolean {
  if (!Number.isFinite(interval) || interval <= 1) return true;
  return minute % interval === 0;
}

/** Which half of the day a 24-hour time falls in. */
export function meridiemOf(value: TimeValue): Meridiem {
  return value.hour < 12 ? 'am' : 'pm';
}

/**
 * The hour as shown on a 12-hour face: 0 → 12, 13 → 1, 12 → 12.
 *
 * Midnight and noon both display as 12, which is exactly why the stored value
 * stays 24-hour: the display is lossy and the storage is not.
 */
export function to12Hour(hour: number): number {
  const wrapped = mod(hour, HOURS_PER_DAY) % 12;
  return wrapped === 0 ? 12 : wrapped;
}

/** Inverse of {@link to12Hour}: a 1–12 reading plus a meridiem back to 0–23. */
export function from12Hour(hour12: number, meridiem: Meridiem): number {
  const base = mod(hour12, 12);
  return meridiem === 'pm' ? base + 12 : base;
}

/**
 * Move a time to the other half of the day, keeping the minutes.
 *
 * Used by the ق.ظ/ب.ظ pills. Note this is *not* "add 12 hours" conceptually —
 * pressing ب.ظ on `09:00` must give `21:00`, and pressing it again must give
 * back `09:00`, which a blind `+12` with wrapping happens to satisfy but a
 * clamped one would not.
 */
export function withMeridiem(value: TimeValue, meridiem: Meridiem): TimeValue {
  return { ...value, hour: from12Hour(to12Hour(value.hour), meridiem) };
}

/** Replace one unit, normalising whatever the caller passed. */
export function withHour(value: TimeValue, hour: number): TimeValue {
  return normalizeTime({ ...value, hour });
}

export function withMinute(value: TimeValue, minute: number): TimeValue {
  return normalizeTime({ ...value, minute });
}

export function withSecond(value: TimeValue, second: number): TimeValue {
  return normalizeTime({ ...value, second });
}

/**
 * The current wall-clock time.
 *
 * Deliberately the *only* ambient-clock read in the package, and every entry
 * point that needs "now" takes an injectable override instead of calling this
 * directly — the same reason the date picker lets a consumer pass `today`. A
 * server and a browser that disagree about the current minute must not produce
 * two different renders.
 */
export function nowTime(): TimeValue {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  };
}

// ---------------------------------------------------------------------------
// Durations
// ---------------------------------------------------------------------------

/** Total minutes a duration represents. */
export function durationToMinutes(value: DurationValue): number {
  return value.hours * MINUTES_PER_HOUR + value.minutes;
}

/**
 * Minutes back to a duration. Unlike {@link fromMinutes} this does **not** wrap
 * at 24 hours: a 30-hour duration is meaningful and must survive the round trip.
 */
export function durationFromMinutes(minutes: number): DurationValue {
  const total = Math.max(0, Math.round(minutes));
  return {
    hours: floorDiv(total, MINUTES_PER_HOUR),
    minutes: total % MINUTES_PER_HOUR,
  };
}

/** Hold a duration inside `[min, max]` minutes. */
export function clampDuration(
  value: DurationValue,
  minMinutes: number | null | undefined,
  maxMinutes: number | null | undefined,
): DurationValue {
  const total = durationToMinutes(value);
  if (minMinutes != null && total < minMinutes)
    return durationFromMinutes(minMinutes);
  if (maxMinutes != null && total > maxMinutes)
    return durationFromMinutes(maxMinutes);
  return value;
}
