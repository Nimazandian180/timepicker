/**
 * Injectable constraint config — the time picker's equivalent of the date
 * picker's holiday config. Everything is data, nothing is hardcoded, and the
 * whole thing is optional.
 */
import type { TimeValue } from '../core/types';

/** A closed `[from, to]` span of minutes within an hour, e.g. lunch 30–45. */
export interface MinuteRange {
  /** First disabled minute, 0–59. */
  from: number;
  /** Last disabled minute, 0–59, inclusive. */
  to: number;
}

/**
 * Everything that can rule a time out.
 *
 * The rules compose: a time is selectable only if it clears *all* of them. They
 * are checked cheapest-first, so a picker with only a `minTime` never pays for
 * the predicate path.
 */
export interface TimeConstraints {
  /** Earliest selectable time, inclusive. */
  minTime?: TimeValue | null;
  /** Latest selectable time, inclusive. */
  maxTime?: TimeValue | null;
  /** Whole hours that are never selectable, 0–23. */
  disabledHours?: readonly number[];
  /** Minutes-past-the-hour that are never selectable, applied to every hour. */
  disabledMinutes?: readonly number[];
  /**
   * Minute spans that are never selectable, applied to every hour. Cheaper to
   * write than listing `disabledMinutes` one by one for something like «نیم‌ساعت
   * دوم هر ساعت».
   */
  disabledMinuteRanges?: readonly MinuteRange[];
  /**
   * Individual times that are ruled out — a booked slot, a break. Compared at
   * minute precision unless the picker is showing seconds.
   */
  disabledTimes?: readonly TimeValue[];
  /**
   * The escape hatch: return `true` to disable a specific time. Runs last, and
   * only when everything else has passed.
   *
   * Hoist or memoize it — a new identity on every render re-evaluates every
   * tick on the clock face.
   */
  disabledTime?: (value: TimeValue) => boolean;
}

/** Why a time was rejected, so the UI can say something useful. */
export type TimeRejection =
  | 'before-min'
  | 'after-max'
  | 'disabled-hour'
  | 'disabled-minute'
  | 'disabled-time'
  | 'off-interval';

/** The verdict on one time. */
export interface TimeVerdict {
  /** True when the time clears every rule. */
  isAllowed: boolean;
  /** The first rule that rejected it, or `null` when allowed. */
  reason: TimeRejection | null;
}
