/**
 * Fixed vocabulary of the picker. Persian-first, with no i18n framework: every
 * user-visible string the package ships lives here, so a consumer who needs
 * different wording overrides one object rather than forking a component.
 */
import type { TimeFormat } from './types';

/** ق.ظ / ب.ظ — the Persian AM/PM abbreviations. */
export const MERIDIEM_LABELS = {
  am: 'ق.ظ',
  pm: 'ب.ظ',
} as const;

/** Long forms, used for screen readers where the abbreviation reads poorly. */
export const MERIDIEM_LABELS_LONG = {
  am: 'قبل از ظهر',
  pm: 'بعد از ظهر',
} as const;

/** Field labels for the digital inputs and the clock's stage switcher. */
export const UNIT_LABELS = {
  hour: 'ساعت',
  minute: 'دقیقه',
  second: 'ثانیه',
} as const;

/** Footer actions. */
export const ACTION_LABELS = {
  now: 'اکنون',
  clear: 'پاک کردن',
  cancel: 'لغو',
  done: 'تأیید',
} as const;

/** The analog/digital toggle in hybrid mode. */
export const VIEW_LABELS = {
  analog: 'عقربه‌ای',
  digital: 'عددی',
} as const;

/** Duration-mode suffixes: «۱ ساعت و ۳۰ دقیقه» shortens to «۱س ۳۰د». */
export const DURATION_LABELS = {
  hours: 'ساعت',
  minutes: 'دقیقه',
} as const;

/** Messages for the validation/error state. */
export const ERROR_LABELS = {
  outOfRange: 'زمان انتخاب‌شده خارج از بازهٔ مجاز است.',
  disabled: 'این زمان قابل انتخاب نیست.',
  endBeforeStart: 'زمان پایان نمی‌تواند پیش از زمان شروع باشد.',
  durationOutOfRange: 'مدت انتخاب‌شده خارج از بازهٔ مجاز است.',
} as const;

/** Minutes in an hour / hours in a day, named so the math reads as intent. */
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

/** How many ticks each clock stage draws around the face. */
export const HOUR_TICKS_12 = 12;
export const MINUTE_TICKS = 12;

/** The interval presets the demo and docs advertise. Any number is accepted. */
export const MINUTE_INTERVAL_PRESETS = [1, 5, 10, 15, 30] as const;

/** Default display format. 24-hour is the norm in Iranian interfaces. */
export const DEFAULT_FORMAT: TimeFormat = '24h';
