/** Injectable constraint config. Everything is data, and all of it optional. */
import type { TimeValue } from '../core/types';

/** A closed `[from, to]` span of minutes within an hour, e.g. lunch 30–45. */
export interface MinuteRange {
  /** First disabled minute, 0–59. */
  from: number;
  /** Last disabled minute, 0–59, inclusive. */
  to: number;
}

/** Everything that can rule a time out. A time must clear every rule. */
export interface TimeConstraints {
  /** Earliest selectable time, inclusive. */
  minTime?: TimeValue | null;
  /** Latest selectable time, inclusive. */
  maxTime?: TimeValue | null;
  /** Whole hours that are never selectable, 0–23. */
  disabledHours?: readonly number[];
  /** Minutes-past-the-hour that are never selectable, applied to every hour. */
  disabledMinutes?: readonly number[];
  /** Minute spans that are never selectable, applied to every hour. */
  disabledMinuteRanges?: readonly MinuteRange[];
  /** Individual times that are ruled out. Minute precision unless showing seconds. */
  disabledTimes?: readonly TimeValue[];
  /**
   * Escape hatch: return `true` to disable a time. Runs last, and only once
   * everything else has passed. Hoist or memoize it.
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
