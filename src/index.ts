/**
 * Jalali Time Picker — public API.
 *
 * Self-contained, RTL-first Persian time picker with an analog clock and
 * digital fields. This barrel is the only intended import surface; nothing here
 * depends on a host application, and nothing here depends on
 * `@aliasadollahi/jalali-datepicker` — the optional bridge to it lives in its
 * own entry point, `@aliasadollahi/jalali-timepicker/plugin`.
 */

// ----- Styled component -----
export { JalaliTimePicker } from './components/JalaliTimePicker';
export type { JalaliTimePickerProps } from './components/JalaliTimePicker';

// ----- Presentational pieces (build your own layout) -----
export { AnalogClock } from './components/AnalogClock';
export type { AnalogClockProps } from './components/AnalogClock';
export { DigitalInput } from './components/DigitalInput';
export type { DigitalInputProps } from './components/DigitalInput';
export { TimeDisplay } from './components/TimeDisplay';
export type { TimeDisplayProps } from './components/TimeDisplay';
export { TimeFooter } from './components/TimeFooter';
export type { TimeFooterProps } from './components/TimeFooter';
export { ViewSwitch } from './components/ViewSwitch';
export type { ViewSwitchProps } from './components/ViewSwitch';
export { RangeEndpoints } from './components/RangeEndpoints';
export type { RangeEndpointsProps } from './components/RangeEndpoints';
export { TimezoneSelect } from './components/TimezoneSelect';
export type { TimezoneSelectProps } from './components/TimezoneSelect';

// ----- Headless hook (build your own UI on top) -----
export { useJalaliTimePicker } from './react/useJalaliTimePicker';
export type {
  UseJalaliTimePickerOptions,
  UseJalaliTimePickerResult,
  ClockHands,
  RangeEndpoint,
} from './react/useJalaliTimePicker';
export { useClockDrag } from './react/useClockDrag';
export type {
  UseClockDragOptions,
  ClockDragHandlers,
} from './react/useClockDrag';

// ----- Output adapters: convert a selection to text / Date / numbers -----
export {
  formatTime,
  formatTimeRange,
  formatDuration,
  formatDurationISO,
  toISOTime,
  toMinutesOfDay,
  toSecondsOfDay,
  toDate,
  fromDate,
  durationToTotalMinutes,
} from './format/format';
export type { TimeFormatOptions } from './format/format';
export { parseTime, isValidTime, parseField } from './format/parse';
export type { ParseTimeOptions } from './format/parse';
export { toPersianDigits, toLatinDigits, pad2 } from './format/digits';

// ----- Core time math (for custom UIs) -----
export {
  time,
  MIDNIGHT,
  normalizeTime,
  toMinutes,
  toSeconds,
  fromMinutes,
  fromSeconds,
  compareTime,
  isSameTime,
  timeKey,
  clampTime,
  addMinutes,
  addSeconds,
  snapMinute,
  isOnInterval,
  meridiemOf,
  to12Hour,
  from12Hour,
  withMeridiem,
  withHour,
  withMinute,
  withSecond,
  nowTime,
  durationToMinutes,
  durationFromMinutes,
  clampDuration,
} from './core/time';
export {
  angleForValue,
  valueForAngle,
  polar,
  angleForPoint,
  radiusForPoint,
  isInnerRing,
  OUTER_RADIUS,
  INNER_RADIUS,
} from './core/geometry';
export {
  MERIDIEM_LABELS,
  MERIDIEM_LABELS_LONG,
  UNIT_LABELS,
  ACTION_LABELS,
  VIEW_LABELS,
  DURATION_LABELS,
  MINUTE_INTERVAL_PRESETS,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
} from './core/constants';
export type {
  TimeValue,
  TimeRange,
  DurationValue,
  TimeFormat,
  Meridiem,
  ClockStage,
  ClockTick,
  PickerMode,
  SelectionKind,
  CommitMode,
  TimeSelection,
} from './core/types';

// ----- Constraints (injectable config) -----
export {
  resolveTime,
  isTimeAllowed,
  isHourDisabled,
  isMinuteDisabled,
  isSecondDisabled,
  nearestAllowedTime,
  NO_CONSTRAINTS,
} from './constraints/resolve';
export type {
  TimeConstraints,
  MinuteRange,
  TimeRejection,
  TimeVerdict,
} from './constraints/types';

// ----- Timezones (optional) -----
export {
  COMMON_TIMEZONES,
  localTimezone,
  offsetMinutes,
  formatOffset,
  resolveTimezones,
  convertTime,
} from './timezone/list';
export type { TimezoneOption } from './timezone/list';
