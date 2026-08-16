'use client';

/**
 * The date-picker adapter — the optional bridge between this package and
 * `@aliasadollahi/jalali-datepicker`.
 *
 * Imported from `@aliasadollahi/jalali-timepicker/plugin`, never from the main
 * entry, so a consumer who only wants a time picker never pulls this in and a
 * bundler can drop it entirely.
 *
 * ```tsx
 * import { JalaliDatePicker } from '@aliasadollahi/jalali-datepicker';
 * import { timePlugin } from '@aliasadollahi/jalali-timepicker/plugin';
 * import '@aliasadollahi/jalali-timepicker/styles.css';
 *
 * const plugins = [timePlugin({ format: '24h', minuteInterval: 15 })];
 *
 * <JalaliDatePicker
 *   plugins={plugins}
 *   onConfirm={(value) => {
 *     // { year, month, day, hour, minute, second }
 *   }}
 * />
 * ```
 */
import { JalaliTimePicker } from '../components/JalaliTimePicker';
import type { JalaliTimePickerProps } from '../components/JalaliTimePicker';
import { MIDNIGHT } from '../core/time';
import type { TimeValue } from '../core/types';
import type { DatePickerPlugin, DatePickerSlot } from './types';

/** The fields the plugin merges into the date picker's emitted value. */
export interface TimeExtras {
  hour: number;
  minute: number;
  second: number;
}

/** A date and a time in one object — what the host's `onConfirm` receives. */
export type JalaliDateTime = {
  year: number;
  month: number;
  day: number;
} & TimeExtras;

export interface TimePluginOptions extends Omit<
  Extract<JalaliTimePickerProps, { selectionMode?: 'single' }>,
  'selectionMode' | 'value' | 'defaultValue' | 'onChange' | 'onConfirm'
> {
  /** Where the clock is placed inside the card. Default `'panel'`. */
  slot?: DatePickerSlot;
  /** The time the picker starts on. Default midnight. */
  defaultValue?: TimeValue;
  /** Fired whenever the time changes, independent of the date. */
  onTimeChange?: (value: TimeValue) => void;
  /**
   * Unique name, if you mount two clocks in one picker (a start and an end,
   * say). Default `'time'` — two plugins sharing a name would share state.
   */
  name?: string;
}

/**
 * Build a date-picker plugin that adds a time picker to the calendar.
 *
 * The returned object is a plain value: hoist it (or memoize it) rather than
 * building it inline in render, so the host is not handed a new array identity
 * on every pass.
 */
export function timePlugin(
  options: TimePluginOptions = {},
): DatePickerPlugin<TimeValue, TimeExtras> {
  const {
    slot = 'panel',
    defaultValue = MIDNIGHT,
    onTimeChange,
    name = 'time',
    // Everything else is forwarded to the picker untouched.
    ...pickerProps
  } = options;

  return {
    name,
    slot,
    initialState: defaultValue,

    render: (ctx) => (
      <JalaliTimePicker
        {...pickerProps}
        // The host card already supplies the chrome, the footer and the RTL
        // root, so the embedded picker drops all three. Without this you get a
        // card inside a card and two competing تأیید buttons.
        showFooter={false}
        className={EMBEDDED_CLASS}
        value={ctx.state}
        // `'instant'` because the host owns commitment: every change has to
        // reach the plugin's state immediately, or تأیید would commit the date
        // with a stale time.
        commitMode="instant"
        onChange={(value) => {
          ctx.setState(value);
          onTimeChange?.(value);
        }}
      />
    ),

    // Merged into whatever the date picker emits, so a consumer's `onConfirm`
    // receives `{ year, month, day, hour, minute, second }` — and gets that
    // shape *in the types*, not just at runtime.
    extendValue: (_date, state) => ({
      hour: state.hour,
      minute: state.minute,
      second: state.second,
    }),
  };
}

/**
 * Marks the picker as embedded so the stylesheet can strip its card chrome.
 * A plain global class rather than a CSS-module hash, because the host renders
 * this element and cannot resolve our module's names.
 */
const EMBEDDED_CLASS = 'jtp-embedded';

export type {
  DatePickerPlugin,
  AnyDatePickerPlugin,
  DatePickerPluginContext,
  DatePickerSlot,
  JalaliDateLike,
  JalaliRangeLike,
} from './types';
