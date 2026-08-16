/**
 * A wall-clock time, always stored in 24-hour form regardless of how it is
 * displayed. `format: '12h'` is a presentation choice only — it never changes
 * what is stored — so switching between 12h and 24h can never corrupt a value.
 *
 * This is the only time shape exposed to consumers. No `Date`, no dayjs
 * instance and no timezone leak across the public API, which keeps the package
 * engine-agnostic and safe to use on a server.
 */
export interface TimeValue {
  /** Hour of day, 0–23. */
  hour: number;
  /** Minute, 0–59. */
  minute: number;
  /** Second, 0–59. Always present; ignored entirely unless `showSeconds`. */
  second: number;
}

/**
 * A start/end pair for range selection. `end` is `null` while the user is still
 * picking the second endpoint; a committed range always has both set.
 */
export interface TimeRange {
  start: TimeValue;
  end: TimeValue | null;
}

/**
 * A length of time rather than a point in it — what `duration` mode selects.
 * Kept separate from {@link TimeValue} on purpose: `25h 30m` is a perfectly
 * good duration and a nonsense clock time, so they cannot share a shape.
 */
export interface DurationValue {
  hours: number;
  minutes: number;
}

/** 12-hour display with a ق.ظ/ب.ظ pill, or plain 24-hour display. */
export type TimeFormat = '12h' | '24h';

/** Which half of the day a 12-hour reading falls in. */
export type Meridiem = 'am' | 'pm';

/** Which unit the analog clock is currently selecting. */
export type ClockStage = 'hour' | 'minute' | 'second';

/**
 * How the picker presents itself.
 *
 * - `'analog'`  — clock face only.
 * - `'digital'` — editable fields only.
 * - `'hybrid'`  — both, kept in sync. The default.
 */
export type PickerMode = 'analog' | 'digital' | 'hybrid';

/** Which selection shape the picker produces. */
export type SelectionKind = 'single' | 'range' | 'duration';

/** When the selection commits: `'instant'` on every change, `'confirm'` on تأیید. */
export type CommitMode = 'instant' | 'confirm';

/** Whatever the picker currently holds, depending on {@link SelectionKind}. */
export type TimeSelection = TimeValue | TimeRange | DurationValue | null;

/**
 * One number drawn on the clock face, already positioned. The geometry is
 * resolved in the core layer so any UI — the bundled one or a consumer's own —
 * can lay out a face without redoing trigonometry.
 */
export interface ClockTick {
  /** The underlying value: an hour (0–23), a minute (0–59) or a second (0–59). */
  value: number;
  /**
   * Which spoke of the dial this tick sits on — 0–11 for hours, 0–59 for
   * minutes and seconds.
   *
   * Distinct from `value` because a 24-hour face maps two hours onto every
   * spoke: hour 3 and hour 15 are both at position 3, told apart by `isInner`.
   * A drag can only ever produce a position (it reads an angle), so this is the
   * space every selection call speaks — see `selectTick` / `dragTo`.
   */
  position: number;
  /** The text drawn in the tick, already in Persian digits. */
  label: string;
  /** Stable React key. */
  key: string;
  /** Degrees clockwise from 12 o'clock. */
  angle: number;
  /** Position as a percentage of the face box, ready for `left`/`top`. */
  x: number;
  y: number;
  /** True for the 13–24 ring drawn inside the 1–12 ring in 24-hour mode. */
  isInner: boolean;
  /** True when this tick is the currently selected value. */
  isSelected: boolean;
  /** True when every time this tick could produce is ruled out by constraints. */
  isDisabled: boolean;
}
