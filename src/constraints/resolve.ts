/**
 * Constraint evaluation. Pure functions over {@link TimeConstraints} — the
 * mirror of the date picker's `holidays/resolve.ts`.
 *
 * Two distinct questions live here and they are easy to conflate:
 *
 *   - *Is this exact time allowed?* — {@link resolveTime}, used to validate a
 *     value and to decide whether تأیید may commit.
 *   - *Is any time under this clock tick allowed?* — {@link isHourDisabled} and
 *     {@link isMinuteDisabled}. An hour is only greyed out when **every** minute
 *     inside it is rejected; greying out 09:00 because 09:15 happens to be
 *     booked would make the hour unreachable.
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
 * Judge one exact time.
 *
 * `seconds` controls the precision of the min/max comparison and of
 * `disabledTimes` matching: with the seconds field hidden, a `maxTime` of
 * `17:00` must not reject `17:00:30`, because the user has no way to express
 * anything but `:00` and would be stuck against an invisible wall.
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
 * True when no minute of `hour` is selectable, so the tick can be greyed out.
 *
 * Only minutes on the configured interval are considered: at `minuteInterval:
 * 30` the only reachable minutes are :00 and :30, so an hour whose :00 and :30
 * are both booked really is dead even if :17 would have been fine.
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
 * The nearest allowed time to `value`, or `null` when the constraints leave
 * nothing selectable at all.
 *
 * Used when a value arrives out of range — an initial value outside `minTime`,
 * or اکنون pressed outside business hours. Searching outward from the requested
 * time (rather than clamping to the bound) lands on the closest usable slot in
 * either direction, which is what «نزدیک‌ترین زمان مجاز» should mean.
 *
 * The search is bounded by a day's worth of steps, so a fully-disabled config
 * terminates instead of spinning.
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

  // Walk the interval *grid*, not offsets from `value`. Stepping outward from
  // an off-grid start (10:07 at a 15-minute interval) only ever visits other
  // off-grid times, so every candidate would be rejected for `off-interval` and
  // the search would return null with plenty of free slots available.
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
    // Genuinely nearest, by distance — with a forward tie-break, so an equally
    // close later slot wins. "Move it on a bit" is the kinder default when the
    // requested time is unavailable.
    const downFirst = start - down < up - start;
    const first = at(downFirst ? down : up);
    if (first) return first;
    const second = at(downFirst ? up : down);
    if (second) return second;
  }
  return null;
}
