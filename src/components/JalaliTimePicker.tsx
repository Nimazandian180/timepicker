'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { DURATION_LABELS } from '../core/constants';
import type {
  CommitMode,
  DurationValue,
  PickerMode,
  TimeFormat,
  TimeRange,
  TimeValue,
} from '../core/types';
import { formatDuration, formatTime } from '../format/format';
import { useJalaliTimePicker } from '../react/useJalaliTimePicker';
import { localTimezone } from '../timezone/list';
import { cn } from '../utils/cn';
import { AnalogClock } from './AnalogClock';
import { DigitalInput } from './DigitalInput';
import { AlertIcon } from './icons';
import { RangeEndpoints } from './RangeEndpoints';
import { TimeDisplay } from './TimeDisplay';
import { TimeFooter } from './TimeFooter';
import { TimezoneSelect } from './TimezoneSelect';
import { ViewSwitch } from './ViewSwitch';
import styles from './JalaliTimePicker.module.css';

interface CommonProps {
  className?: string;
  /** `'analog'`, `'digital'`, or `'hybrid'` (both, switchable). Default `'hybrid'`. */
  mode?: PickerMode;
  /** 12-hour with ق.ظ/ب.ظ pills, or 24-hour. Default `'24h'`. */
  format?: TimeFormat;
  /** Show and select seconds. Default `false`. */
  showSeconds?: boolean;
  /** Snap minutes to a grid: 1, 5, 10, 15, 30 — or any number. Default `1`. */
  minuteInterval?: number;
  /** Pad a single-digit hour: `۰۹:۰۵` vs `۹:۰۵`. Default `true`. */
  leadingZero?: boolean;
  /** Earliest selectable time, inclusive. */
  minTime?: TimeValue | null;
  /** Latest selectable time, inclusive. */
  maxTime?: TimeValue | null;
  /** Whole hours that are never selectable, 0–23. */
  disabledHours?: readonly number[];
  /** Minutes-past-the-hour that are never selectable, in every hour. */
  disabledMinutes?: readonly number[];
  /** Minute spans that are never selectable, in every hour. */
  disabledMinuteRanges?: readonly { from: number; to: number }[];
  /** Individual times that are ruled out. */
  disabledTimes?: readonly TimeValue[];
  /** The escape hatch: return `true` to disable a time. Hoist or memoize it. */
  disabledTime?: (value: TimeValue) => boolean;
  /** Render the validation message when the draft breaks a constraint. Default `true`. */
  showError?: boolean;
  /**
   * What counts as "now": where اکنون jumps and what the picker opens on.
   * Defaults to the ambient clock — inject it to keep a server and a browser
   * render agreeing, exactly as the date picker's `today` does.
   */
  now?: TimeValue | null;
  /** `'instant'` commits on every change; `'confirm'` (default) stages until تأیید. */
  commitMode?: CommitMode;

  // ----- footer actions, each hideable -----
  showNow?: boolean;
  showClear?: boolean;
  showCancel?: boolean;
  showDone?: boolean;
  showFooter?: boolean;
  /** Fired when لغو is pressed (after the draft is reverted). */
  onCancel?: () => void;
  /** Fired when پاک کردن is pressed. */
  onClear?: () => void;

  // ----- optional timezone row -----
  /** Show the timezone selector. Off by default, so the basic picker stays simple. */
  timezone?: boolean;
  /** The selected IANA id when `timezone` is on. Defaults to the viewer's own. */
  timezoneValue?: string;
  onTimezoneChange?: (timezone: string) => void;
  /** Which zones to offer. Defaults to a short common list. */
  timezones?: readonly string[];
}

interface SingleModeProps extends CommonProps {
  selectionMode?: 'single';
  value?: TimeValue | null;
  defaultValue?: TimeValue | null;
  onChange?: (value: TimeValue) => void;
  onConfirm?: (value: TimeValue | null) => void;
}

interface RangeModeProps extends CommonProps {
  selectionMode: 'range';
  value?: TimeRange | null;
  defaultValue?: TimeRange | null;
  onChange?: (value: TimeRange) => void;
  onConfirm?: (value: TimeRange | null) => void;
  /** Require `end` to be at or after `start`. Default `true`. */
  sameDay?: boolean;
}

interface DurationModeProps extends CommonProps {
  selectionMode: 'duration';
  value?: DurationValue | null;
  defaultValue?: DurationValue | null;
  onChange?: (value: DurationValue) => void;
  onConfirm?: (value: DurationValue | null) => void;
  /** Shortest allowed duration, in minutes. */
  minDuration?: number | null;
  /** Longest allowed duration, in minutes. */
  maxDuration?: number | null;
}

export type JalaliTimePickerProps =
  SingleModeProps | RangeModeProps | DurationModeProps;

/**
 * Inline Persian time picker — analog clock, digital fields, or both.
 *
 * Self-contained and RTL by construction (`dir="rtl"` is set on the root,
 * independent of the host's direction), while the numeric parts stay LTR
 * because `10:30` is a number and not a sentence. Pair it with any
 * popover/dialog/sheet to make a field — the picker itself takes no opinion on
 * how it is presented, exactly like `JalaliDatePicker`.
 */
export function JalaliTimePicker(props: JalaliTimePickerProps) {
  const {
    className,
    mode = 'hybrid',
    format,
    showSeconds = false,
    minuteInterval = 1,
    leadingZero = true,
    showFooter = true,
    showNow = true,
    showClear = false,
    showCancel = true,
    showDone = true,
    showError = true,
    timezone = false,
    timezoneValue,
    onTimezoneChange,
    timezones,
    commitMode,
  } = props;

  const isDuration = props.selectionMode === 'duration';

  const picker = useJalaliTimePicker({
    selectionMode: props.selectionMode ?? 'single',
    value: props.value,
    defaultValue: props.defaultValue,
    onChange: props.onChange as
      ((value: TimeValue | TimeRange | DurationValue) => void) | undefined,
    format,
    showSeconds,
    minuteInterval,
    constraints: {
      minTime: props.minTime,
      maxTime: props.maxTime,
      disabledHours: props.disabledHours,
      disabledMinutes: props.disabledMinutes,
      disabledMinuteRanges: props.disabledMinuteRanges,
      disabledTimes: props.disabledTimes,
      disabledTime: props.disabledTime,
    },
    minDuration: isDuration ? props.minDuration : null,
    maxDuration: isDuration ? props.maxDuration : null,
    sameDay: props.selectionMode === 'range' ? props.sameDay : true,
    now: props.now,
    mode: commitMode,
    pickerMode: mode,
  });

  // Uncontrolled fallback for the timezone row, so `timezone` alone is enough
  // to get a working selector without wiring state up.
  const [localZone, setLocalZone] = useState(localTimezone);
  const zone = timezoneValue ?? localZone;

  const formatOptions = {
    format: picker.format,
    showSeconds,
    leadingZero,
  };

  const handleConfirm = () => {
    const result = picker.confirm();
    if (props.selectionMode === 'range') {
      props.onConfirm?.((result as TimeRange | null) ?? null);
    } else if (props.selectionMode === 'duration') {
      props.onConfirm?.((result as DurationValue | null) ?? null);
    } else {
      props.onConfirm?.((result as TimeValue | null) ?? null);
    }
  };

  const handleCancel = () => {
    picker.reset();
    props.onCancel?.();
  };

  const handleClear = () => {
    picker.clear();
    props.onClear?.();
  };

  /**
   * Escape cancels from anywhere inside the card, which is what a picker in a
   * popover has to do — and it is captured here rather than on `window` so it
   * never steals the key from a host that has its own handler.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      handleCancel();
    }
  };

  // Duration mode reads its own units, and its analog face is really an
  // hours/minutes dial rather than a clock.
  const label = isDuration
    ? formatDuration(picker.duration)
    : formatTime(picker.draft, formatOptions);

  return (
    <div
      dir="rtl"
      lang="fa"
      className={cn(styles.root, className)}
      role="group"
      aria-label={isDuration ? 'انتخاب مدت زمان' : 'انتخاب زمان'}
      onKeyDown={handleKeyDown}
    >
      {props.selectionMode === 'range' && (
        <RangeEndpoints
          range={picker.range}
          endpoint={picker.endpoint}
          onChange={picker.setEndpoint}
          formatOptions={formatOptions}
        />
      )}

      <TimeDisplay
        fields={picker.fields}
        stage={picker.stage}
        onStage={picker.setStage}
        format={picker.format}
        showSeconds={showSeconds}
        meridiem={picker.meridiem}
        onMeridiem={picker.setMeridiem}
        // A duration has no morning or afternoon.
        showMeridiem={!isDuration}
        label={label}
      />

      {picker.canSwitchView && (
        <ViewSwitch view={picker.view} onChange={picker.setView} />
      )}

      {picker.view === 'analog' ? (
        <AnalogClock
          ticks={picker.ticks}
          hands={picker.hands}
          stage={picker.stage}
          format={picker.format}
          showSeconds={showSeconds}
          step={picker.stage === 'minute' ? minuteInterval : 1}
          onSelect={picker.selectTick}
          onDrag={picker.dragTo}
        />
      ) : (
        <DigitalInput
          fields={picker.fields}
          is12Hour={picker.format === '12h' && !isDuration}
          showSeconds={showSeconds}
          onHour={picker.setHour}
          onMinute={picker.setMinute}
          onSecond={picker.setSecond}
          onStep={picker.step}
          maxHour={isDuration ? 23 : undefined}
        />
      )}

      {isDuration && (
        <p className={styles.fieldLabel} dir="rtl">
          {`${DURATION_LABELS.hours} / ${DURATION_LABELS.minutes}`}
        </p>
      )}

      {timezone && (
        <TimezoneSelect
          value={zone}
          options={timezones}
          onChange={(next) => {
            if (!timezoneValue) setLocalZone(next);
            onTimezoneChange?.(next);
          }}
        />
      )}

      {showError && picker.error && (
        // `role="alert"` so the message is announced when it appears, not only
        // when the field is next read.
        <p className={styles.error} role="alert">
          <AlertIcon className={styles.errorIcon} />
          {picker.error}
        </p>
      )}

      {showFooter && (
        <TimeFooter
          showNow={showNow}
          showClear={showClear}
          showCancel={showCancel}
          showDone={showDone}
          canConfirm={picker.canConfirm}
          onNow={picker.setNow}
          onClear={handleClear}
          onCancel={handleCancel}
          onDone={handleConfirm}
        />
      )}
    </div>
  );
}
