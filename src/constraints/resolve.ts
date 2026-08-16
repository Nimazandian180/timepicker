/**
 * Constraint evaluation. Pure functions over {@link TimeConstraints}.
 *
 * Two questions live here, easy to conflate: *is this exact time allowed?*
 * ({@link resolveTime}) versus *is any time under this tick allowed?*
 * ({@link isHourDisabled}). An hour is greyed out only when every minute in it
 * is rejected — otherwise one booked slot would kill the whole hour.
 */
import { MINUTES_PER_HOUR } from '../core/constants';
import { compareTime, isOnInterval, isSameTime, toMinutes } from '../core/time';
import type { TimeValue } from '../core/types';
import type { MinuteRange, TimeConstraints, TimeVerdict } from './types';

const ALLOWED: TimeVerdict = { isAllowed: true, reason: null };

/** No constraints at all — the shared empty object, so identity stays stable. */
export const NO_CONSTRAINTS: TimeConstraints = {};

const inMinuteRange = (minute: number, ranges: readonly MinuteRange[]) =>
  ranges.some((range) => minute >= range.from && minute <= range.to);

/**
 * Judge one exact time. `seconds` sets the comparison precision: with seconds
 * hidden, a `maxTime` of `17:00` must not reject `17:00:30`, which the user
 * has no way to express or avoid.
 */
export function resolveTime(
  value: TimeValue,
  constraints: TimeConstraints = NO_CONSTRAINTS,
  {
    seconds = false,
    interval = 1,
  }: { seconds?: boolean; interval?: number } = {},
): TimeVerdict {
  const {
    minTime,
    maxTime,
    disabledHours,
    disabledMinutes,
    disabledMinuteRanges,
    disabledTimes,
    disabledTime,
  } = constraints;

  if (minTime && compareTime(value, minTime, { seconds }) < 0) {
    return { isAllowed: false, reason: 'before-min' };
  }
  if (maxTime && compareTime(value, maxTime, { seconds }) > 0) {
    return { isAllowed: false, reason: 'after-max' };
  }
  if (disabledHours?.includes(value.hour)) {
    return { isAllowed: false, reason: 'disabled-hour' };
  }
  if (disabledMinutes?.includes(value.minute)) {
    return { isAllowed: false, reason: 'disabled-minute' };
  }
  if (
    disabledMinuteRanges &&
    inMinuteRange(value.minute, disabledMinuteRanges)
  ) {
    return { isAllowed: false, reason: 'disabled-minute' };
  }
  if (!isOnInterval(value.minute, interval)) {
    return { isAllowed: false, reason: 'off-interval' };
  }
  if (
    disabledTimes?.some((disabled) => isSameTime(value, disabled, { seconds }))
  ) {
    return { isAllowed: false, reason: 'disabled-time' };
  }
  if (disabledTime?.(value)) {
    return { isAllowed: false, reason: 'disabled-time' };
  }
  return ALLOWED;
}

/** Shorthand for `resolveTime(...).isAllowed`. */
export function isTimeAllowed(
  value: TimeValue,
  constraints?: TimeConstraints,
  options?: { seconds?: boolean; interval?: number },
): boolean {
  return resolveTime(value, constraints, options).isAllowed;
}

/**
 * True when no minute of `hour` is selectable. Only minutes on the configured
 * interval count — at a 30-minute interval only :00 and :30 are reachable.
 */
export function isHourDisabled(
  hour: number,
  constraints: TimeConstraints = NO_CONSTRAINTS,
  { interval = 1, second = 0 }: { interval?: number; second?: number } = {},
): boolean {
  if (constraints.disabledHours?.includes(hour)) return true;
  const step = Math.max(1, Math.min(interval, MINUTES_PER_HOUR));
  for (let minute = 0; minute < MINUTES_PER_HOUR; minute += step) {
    if (isTimeAllowed({ hour, minute, second }, constraints, { interval })) {
      return false;
    }
  }
  return true;
}

/** True when `minute` is unselectable within `hour`. */
export function isMinuteDisabled(
  hour: number,
  minute: number,
  constraints: TimeConstraints = NO_CONSTRAINTS,
  { interval = 1, second = 0 }: { interval?: number; second?: number } = {},
): boolean {
  return !isTimeAllowed({ hour, minute, second }, constraints, { interval });
}

/** True when `second` is unselectable at `hour:minute`. */
export function isSecondDisabled(
  hour: number,
  minute: number,
  second: number,
  constraints: TimeConstraints = NO_CONSTRAINTS,
): boolean {
  return !isTimeAllowed({ hour, minute, second }, constraints, {
    seconds: true,
  });
}

/**
 * The nearest allowed time to `value`, or `null` when nothing is selectable.
 *
 * Searches outward in both directions rather than clamping to a bound, so
 * اکنون pressed outside business hours lands on the closest usable slot. Bounded
 * by a day's steps, so a fully-disabled config terminates.
 */
export function nearestAllowedTime(
  value: TimeValue,
  constraints: TimeConstraints = NO_CONSTRAINTS,
  {
    interval = 1,
    seconds = false,
  }: { interval?: number; seconds?: boolean } = {},
): TimeValue | null {
  const options = { interval, seconds };
  if (isTimeAllowed(value, constraints, options)) return value;

  const step = Math.max(1, interval);
  const start = toMinutes(value);
  const dayMinutes = 24 * MINUTES_PER_HOUR;

  // Walk the interval *grid*, not offsets from `value`: stepping outward from
  // an off-grid start only ever visits other off-grid times.
  const below = Math.floor(start / step) * step;
  const above = below + step;

  const at = (minutes: number): TimeValue | null => {
    if (minutes < 0 || minutes >= dayMinutes) return null;
    const candidate: TimeValue = {
      hour: Math.floor(minutes / MINUTES_PER_HOUR),
      minute: minutes % MINUTES_PER_HOUR,
      second: 0,
    };
    return isTimeAllowed(candidate, constraints, options) ? candidate : null;
  };

  const limit = Math.ceil(dayMinutes / step);
  for (let offset = 0; offset <= limit; offset += 1) {
    const down = below - offset * step;
    const up = above + offset * step;
    // Nearest by distance, with a forward tie-break.
    const downFirst = start - down < up - start;
    const first = at(downFirst ? down : up);
    if (first) return first;
    const second = at(downFirst ? up : down);
    if (second) return second;
  }
  return null;
}
