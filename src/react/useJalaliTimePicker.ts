'use client';

/**
 * Headless time engine. Holds all picker state — the selection (single time,
 * range, or duration; controlled or uncontrolled), the draft being edited, the
 * hour/minute/second stage, the analog/digital view, format and meridiem — and
 * produces a fully positioned set of clock ticks plus hand angles. It renders
 * nothing, so any UI (the bundled one, or a consumer's own) can be built on top.
 *
 * The invariant worth knowing: **state is always 24-hour**. `format: '12h'` and
 * the ق.ظ/ب.ظ pills are presentation only, which is why toggling the format can
 * never change the selected time.
 */
import { useCallback, useMemo, useState } from 'react';

import {
  HOUR_TICKS_12,
  MINUTE_TICKS,
  MINUTES_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '../core/constants';
import {
  INNER_RADIUS,
  OUTER_RADIUS,
  angleForValue,
  polar,
} from '../core/geometry';
import {
  MIDNIGHT,
  clampDuration,
  compareTime,
  durationFromMinutes,
  durationToMinutes,
  from12Hour,
  isSameTime,
  meridiemOf,
  nowTime,
  normalizeTime,
  snapMinute,
  timeKey,
  to12Hour,
  withMeridiem,
} from '../core/time';
import type {
  ClockStage,
  ClockTick,
  CommitMode,
  DurationValue,
  Meridiem,
  PickerMode,
  SelectionKind,
  TimeFormat,
  TimeRange,
  TimeSelection,
  TimeValue,
} from '../core/types';
import {
  NO_CONSTRAINTS,
  isHourDisabled,
  isMinuteDisabled,
  isSecondDisabled,
  nearestAllowedTime,
  resolveTime,
} from '../constraints/resolve';
import type { TimeConstraints, TimeVerdict } from '../constraints/types';
import { formatTime } from '../format/format';
import { toPersianDigits } from '../format/digits';

/** Which endpoint of a range is being edited. */
export type RangeEndpoint = 'start' | 'end';

export interface UseJalaliTimePickerOptions {
  /** One time, a start/end pair, or a length of time. Default `'single'`. */
  selectionMode?: SelectionKind;
  /** Controlled value, matching {@link UseJalaliTimePickerOptions.selectionMode}. */
  value?: TimeSelection;
  /** Initial value when uncontrolled. */
  defaultValue?: TimeSelection;
  /** Fired when a value is committed (immediately in `'instant'`, on `confirm()` otherwise). */
  onChange?: (value: TimeValue | TimeRange | DurationValue) => void;
  /** 12-hour with ق.ظ/ب.ظ, or 24-hour. Default `'24h'`. */
  format?: TimeFormat;
  /** Show and select seconds. Default `false`. */
  showSeconds?: boolean;
  /** Snap minutes to a grid: 1, 5, 10, 15, 30 — or any number you like. Default `1`. */
  minuteInterval?: number;
  /** What is selectable. See {@link TimeConstraints}. */
  constraints?: TimeConstraints;
  /** Duration mode: shortest allowed duration, in minutes. */
  minDuration?: number | null;
  /** Duration mode: longest allowed duration, in minutes. */
  maxDuration?: number | null;
  /**
   * Range mode: require `end` to be at or after `start`. Default `true`.
   * Set `false` for a span that legitimately crosses midnight (a night shift).
   */
  sameDay?: boolean;
  /**
   * What counts as "now": where اکنون jumps, and the time the picker opens on
   * when it has no value. Defaults to the ambient clock — inject it to keep a
   * server and a client render agreeing, exactly as the date picker's `today`
   * does. `null` disables the shortcut's fallback.
   */
  now?: TimeValue | null;
  /** `'instant'` commits on every change; `'confirm'` stages until `confirm()`. Default `'confirm'`. */
  mode?: CommitMode;
  /** Which surfaces to offer. Default `'hybrid'`. */
  pickerMode?: PickerMode;
}

export interface ClockHands {
  /** Degrees clockwise from 12 for each hand. */
  hour: number;
  minute: number;
  second: number;
  /**
   * True when the current hour lives on the inner 13–24 ring, so the hour hand
   * can be drawn short enough to land on it. Always false in 12-hour mode,
   * which has only one ring.
   */
  hourIsInner: boolean;
}

export interface UseJalaliTimePickerResult {
  // ----- what is being edited -----
  /** The time currently under the hands — the active range endpoint in range mode. */
  draft: TimeValue;
  /** The staged selection, before commit. */
  selected: TimeSelection;
  /** Duration mode: the staged value read as hours + minutes. */
  duration: DurationValue;
  /** True while nothing has been picked. */
  isEmpty: boolean;

  // ----- presentation -----
  format: TimeFormat;
  setFormat: (format: TimeFormat) => void;
  /** The prominent `۱۰:۳۰ ق.ظ` reading of the draft. */
  displayText: string;
  /** The three fields as text, for the digital inputs. */
  fields: { hour: string; minute: string; second: string };
  meridiem: Meridiem;
  setMeridiem: (meridiem: Meridiem) => void;
  /** `'analog'` or `'digital'` — which surface is showing right now. */
  view: 'analog' | 'digital';
  setView: (view: 'analog' | 'digital') => void;
  /** True when the consumer allows switching between the two. */
  canSwitchView: boolean;

  // ----- the clock -----
  stage: ClockStage;
  setStage: (stage: ClockStage) => void;
  /** The ticks to draw for the current stage, already positioned. */
  ticks: ClockTick[];
  /** Hand rotations, in degrees. */
  hands: ClockHands;
  /**
   * Commit the value under a clock tick. `isInner` distinguishes the 13–24 ring
   * from the 1–12 one in 24-hour mode.
   *
   * Advances hour → minute → second (when shown) so the default flow needs no
   * extra taps.
   */
  selectTick: (value: number, isInner?: boolean) => void;
  /**
   * Point a hand at a raw angle while dragging, without advancing the stage.
   * Snapping to {@link UseJalaliTimePickerOptions.minuteInterval} happens here.
   */
  dragTo: (value: number, isInner?: boolean) => void;

  // ----- editing -----
  setHour: (hour: number) => void;
  setMinute: (minute: number) => void;
  setSecond: (second: number) => void;
  setTime: (value: TimeValue) => void;
  /** Nudge one unit by `delta`, wrapping — the increment/decrement controls. */
  step: (unit: ClockStage, delta: number) => void;

  // ----- range -----
  selectionMode: SelectionKind;
  endpoint: RangeEndpoint;
  setEndpoint: (endpoint: RangeEndpoint) => void;
  range: TimeRange | null;

  // ----- validation -----
  /** The verdict on the draft, so a UI can explain *why* تأیید is refused. */
  verdict: TimeVerdict;
  /** A ready-made Persian message, or `null` when the draft is fine. */
  error: string | null;

  // ----- actions -----
  /** Jump to the current time (or the nearest allowed one). */
  setNow: () => void;
  /** Drop the selection entirely. */
  clear: () => void;
  /** Commit the staged selection. Returns it, or `null` when it is invalid. */
  confirm: () => TimeSelection;
  /** Revert the draft to the committed value. */
  reset: () => void;
  isConfirmMode: boolean;
  /** False when the draft breaks a constraint — wire it to تأیید's `disabled`. */
  canConfirm: boolean;
}

const isRange = (value: TimeSelection): value is TimeRange =>
  value !== null && typeof value === 'object' && 'start' in value;

const isDuration = (value: TimeSelection): value is DurationValue =>
  value !== null && typeof value === 'object' && 'hours' in value;

const isTime = (value: TimeSelection): value is TimeValue =>
  value !== null && typeof value === 'object' && 'hour' in value;

/** A stable string identity for any selection, used to detect external changes. */
function selectionKey(value: TimeSelection): string {
  if (!value) return 'none';
  if (isRange(value)) return `${timeKey(value.start)}|${timeKey(value.end)}`;
  if (isDuration(value)) return `d${value.hours}:${value.minutes}`;
  return timeKey(value);
}

/**
 * Duration mode reuses the clock by reading hours into `hour` and minutes into
 * `minute`. The analog face therefore caps a duration at 23h59m; the digital
 * fields have no such limit, which is why `maxDuration` is the real bound.
 */
const durationToTime = (value: DurationValue): TimeValue => ({
  hour: Math.min(23, value.hours),
  minute: value.minutes,
  second: 0,
});

const timeToDuration = (value: TimeValue): DurationValue => ({
  hours: value.hour,
  minutes: value.minute,
});

export function useJalaliTimePicker(
  options: UseJalaliTimePickerOptions = {},
): UseJalaliTimePickerResult {
  const {
    selectionMode = 'single',
    value,
    defaultValue = null,
    onChange,
    format: formatOption,
    showSeconds = false,
    minuteInterval = 1,
    constraints = NO_CONSTRAINTS,
    minDuration = null,
    maxDuration = null,
    sameDay = true,
    now: nowOption,
    mode = 'confirm',
    pickerMode = 'hybrid',
  } = options;

  // Resolved once per render, so every "now" question answers the same way.
  // `null` stays null; only `undefined` falls back to the ambient clock.
  const now = nowOption !== undefined ? nowOption : nowTime();
  // Where اکنون goes and what the picker opens on. It must land somewhere even
  // when the consumer marked no "now".
  const nowTarget = now ?? nowTime();
  // Stands in for `nowTarget` in dependency arrays: it is a plain per-render
  // value, so keying on the time *string* keeps memos stable while the minute
  // does not change, whoever supplied it.
  const nowKey = timeKey(nowTarget);

  const isControlled = value !== undefined;
  const [internalCommitted, setInternalCommitted] =
    useState<TimeSelection>(defaultValue);
  const committed = isControlled ? (value ?? null) : internalCommitted;

  const [selected, setSelected] = useState<TimeSelection>(committed);
  const [endpoint, setEndpoint] = useState<RangeEndpoint>('start');
  const [stage, setStage] = useState<ClockStage>('hour');
  const [format, setFormat] = useState<TimeFormat>(formatOption ?? '24h');
  const [view, setView] = useState<'analog' | 'digital'>(
    pickerMode === 'digital' ? 'digital' : 'analog',
  );

  // A controlled `format` prop wins over local state, so the consumer stays in
  // charge when they choose to be; without one the toggle drives it.
  const activeFormat = formatOption ?? format;

  // Keep the draft in sync when the committed value changes underneath us —
  // the same "adjust state during render" pattern the date picker uses, so no
  // effect and no cascading render.
  const committedKey = selectionKey(committed);
  const [syncedKey, setSyncedKey] = useState(committedKey);
  if (syncedKey !== committedKey) {
    setSyncedKey(committedKey);
    setSelected(committed);
  }

  // ----- the time under the hands -------------------------------------------

  const draft = useMemo<TimeValue>(() => {
    if (selectionMode === 'duration') {
      return isDuration(selected)
        ? durationToTime(selected)
        : { hour: 0, minute: 0, second: 0 };
    }
    if (selectionMode === 'range') {
      const current = isRange(selected) ? selected : null;
      if (!current) return snapMinute(nowTarget, minuteInterval);
      return endpoint === 'end'
        ? (current.end ?? current.start)
        : current.start;
    }
    return isTime(selected) ? selected : snapMinute(nowTarget, minuteInterval);
    // `nowKey` rather than `nowTarget`: a caller passing a fresh literal each
    // render would otherwise recompute (and re-snap) the draft every time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionMode, selected, endpoint, minuteInterval, nowKey]);

  const isEmpty = selected === null;

  // ----- writing back --------------------------------------------------------

  const commit = useCallback(
    (next: TimeValue | TimeRange | DurationValue) => {
      if (!isControlled) setInternalCommitted(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  /**
   * Fold a new draft time back into whatever shape the selection has, then
   * stage it — and commit straight away in instant mode.
   */
  const applyDraft = useCallback(
    (next: TimeValue) => {
      if (selectionMode === 'duration') {
        const bounded = clampDuration(
          timeToDuration(next),
          minDuration,
          maxDuration,
        );
        setSelected(bounded);
        if (mode === 'instant') commit(bounded);
        return;
      }

      if (selectionMode === 'range') {
        const current = isRange(selected) ? selected : null;
        let updated: TimeRange;
        if (endpoint === 'start') {
          const end = current?.end ?? null;
          // Pushing the start past the end would invert the range; carry the
          // end along instead of silently producing `17:00 – 09:00`.
          updated = {
            start: next,
            end: sameDay && end && compareTime(next, end) > 0 ? next : end,
          };
        } else {
          const start = current?.start ?? next;
          updated = {
            start,
            end: sameDay && compareTime(next, start) < 0 ? start : next,
          };
        }
        setSelected(updated);
        if (mode === 'instant' && updated.end) commit(updated);
        return;
      }

      setSelected(next);
      if (mode === 'instant') commit(next);
    },
    [
      selectionMode,
      selected,
      endpoint,
      sameDay,
      mode,
      commit,
      minDuration,
      maxDuration,
    ],
  );

  const setTime = useCallback(
    (next: TimeValue) => applyDraft(normalizeTime(next)),
    [applyDraft],
  );

  const setHour = useCallback(
    (hour: number) => applyDraft(normalizeTime({ ...draft, hour })),
    [applyDraft, draft],
  );

  const setMinute = useCallback(
    (minute: number) => applyDraft(normalizeTime({ ...draft, minute })),
    [applyDraft, draft],
  );

  const setSecond = useCallback(
    (second: number) => applyDraft(normalizeTime({ ...draft, second })),
    [applyDraft, draft],
  );

  const step = useCallback(
    (unit: ClockStage, delta: number) => {
      if (unit === 'hour') {
        applyDraft(normalizeTime({ ...draft, hour: draft.hour + delta }));
      } else if (unit === 'minute') {
        // Nudging minutes moves by a whole interval, so the up-arrow on a
        // 15-minute picker goes :00 → :15 rather than :00 → :01 → …
        const stepBy = Math.max(1, minuteInterval);
        applyDraft(
          normalizeTime({ ...draft, minute: draft.minute + delta * stepBy }),
        );
      } else {
        applyDraft(normalizeTime({ ...draft, second: draft.second + delta }));
      }
    },
    [applyDraft, draft, minuteInterval],
  );

  const setMeridiem = useCallback(
    (meridiem: Meridiem) => applyDraft(withMeridiem(draft, meridiem)),
    [applyDraft, draft],
  );

  // ----- the clock face ------------------------------------------------------

  const is24 = activeFormat === '24h';

  const ticks = useMemo<ClockTick[]>(() => {
    if (stage === 'hour') {
      // 12-hour mode draws one ring of 1–12; 24-hour draws 1–12 outside and
      // 13–24 (with 00 at the top) inside, the layout every desktop clock uses.
      // The outer ring is 1…12, drawn at positions 1…11 and 0 (12 sits at the
      // top). In 12-hour mode those are the only ticks and the meridiem decides
      // the real hour; in 24-hour mode they are literally hours 1–12.
      const outer = Array.from({ length: HOUR_TICKS_12 }, (_, index) => {
        const hour12 = index + 1;
        const position = hour12 === 12 ? 0 : hour12;
        const hour24 = is24 ? hour12 : from12Hour(hour12, meridiemOf(draft));
        return buildTick({
          value: hour24,
          position,
          label: toPersianDigits(hour12),
          angle: angleForValue(position, HOUR_TICKS_12),
          radius: OUTER_RADIUS,
          isInner: false,
          isSelected: draft.hour === hour24,
          isDisabled: isHourDisabled(hour24, constraints, {
            interval: minuteInterval,
          }),
        });
      });

      if (!is24) return outer;

      // The inner ring is 13…24, where 24 is stored as hour 0 and labelled ۰۰.
      const inner = Array.from({ length: HOUR_TICKS_12 }, (_, index) => {
        const shown = index + 13;
        const hour24 = shown === 24 ? 0 : shown;
        const position = shown === 24 ? 0 : shown - 12;
        return buildTick({
          value: hour24,
          position,
          label: hour24 === 0 ? '۰۰' : toPersianDigits(hour24),
          angle: angleForValue(position, HOUR_TICKS_12),
          radius: INNER_RADIUS,
          isInner: true,
          isSelected: draft.hour === hour24,
          isDisabled: isHourDisabled(hour24, constraints, {
            interval: minuteInterval,
          }),
        });
      });
      return [...outer, ...inner];
    }

    const unit = stage === 'minute' ? 'minute' : 'second';

    // Minutes default to 12 ticks at 5-unit steps, the familiar clock ring.
    // A coarser interval that divides the hour evenly gets its *own* ring
    // instead — a 15-minute picker shows ۰۰ ۱۵ ۳۰ ۴۵ rather than drawing eight
    // numbers it would then have to grey out as unreachable. An interval that
    // does not divide 60 (a custom 7, say) keeps the 5-step ring, where the
    // off-grid ticks really are disabled and the hand snaps between them.
    const labelStep =
      unit === 'minute' &&
      minuteInterval > 5 &&
      minuteInterval < MINUTES_PER_HOUR &&
      MINUTES_PER_HOUR % minuteInterval === 0
        ? minuteInterval
        : MINUTES_PER_HOUR / MINUTE_TICKS;
    const count = MINUTES_PER_HOUR / labelStep;

    return Array.from({ length: count }, (_, index) => {
      const value = index * labelStep;
      const disabled =
        unit === 'minute'
          ? isMinuteDisabled(draft.hour, value, constraints, {
              interval: minuteInterval,
            })
          : isSecondDisabled(draft.hour, draft.minute, value, constraints);
      return buildTick({
        value,
        // Minutes and seconds are their own position: the dial has 60 steps and
        // the labelled ticks land on every fifth one.
        position: value,
        label: value === 0 ? '۰۰' : toPersianDigits(value),
        // Angled by the value on the 60-step dial, not by the tick index, so a
        // custom ring still lands where a clock says it should.
        angle: angleForValue(value, MINUTES_PER_HOUR),
        radius: OUTER_RADIUS,
        isInner: false,
        isSelected:
          unit === 'minute' ? draft.minute === value : draft.second === value,
        isDisabled: disabled,
      });
    });
  }, [stage, is24, draft, constraints, minuteInterval]);

  const hands = useMemo<ClockHands>(
    () => ({
      /*
       * The hour hand drifts with the minutes, as a real one does — a hand
       * frozen on the hour looks broken at 10:59.
       *
       * Except while the hour is being *selected*. There the hand is not a
       * clock reading, it is the selection marker: its knob has to sit exactly
       * on the number you picked. At 10:30 a drifting hand lands half-way to
       * ۱۱, which reads as having selected the wrong hour.
       */
      hour:
        angleForValue(draft.hour % 12, HOUR_TICKS_12) +
        (stage === 'hour'
          ? 0
          : (draft.minute / MINUTES_PER_HOUR) * (360 / HOUR_TICKS_12)),
      // Same rule for the minute hand's drift across the seconds: it is only a
      // reading when the minute is not the thing being selected.
      minute:
        angleForValue(draft.minute, MINUTES_PER_HOUR) +
        (stage === 'minute'
          ? 0
          : (draft.second / SECONDS_PER_MINUTE) * (360 / MINUTES_PER_HOUR)),
      second: angleForValue(draft.second, SECONDS_PER_MINUTE),
      // 00 and 13–23 are drawn on the inner ring; 1–12 on the outer one.
      hourIsInner: is24 && (draft.hour === 0 || draft.hour > 12),
    }),
    [draft, is24, stage],
  );

  /**
   * Turn a dial position (0–11) into the hour it means.
   *
   * A position is all a drag can produce — it reads an angle — and on a
   * 24-hour face every position carries two hours, so `isInner` picks the ring:
   * position 3 is hour 3 outside and hour 15 inside, and position 0 is 12 and
   * 00 respectively. In 12-hour mode there is only one ring and the current
   * meridiem supplies the other half of the day, which is why pressing ب.ظ and
   * then picking 9 gives 21:00.
   */
  const hourFromPosition = useCallback(
    (position: number, isInner: boolean): number => {
      if (is24) {
        if (isInner) return position === 0 ? 0 : position + 12;
        return position === 0 ? 12 : position;
      }
      return from12Hour(position === 0 ? 12 : position, meridiemOf(draft));
    },
    [is24, draft],
  );

  const dragTo = useCallback(
    (position: number, isInner = false) => {
      if (stage === 'hour') {
        applyDraft(
          normalizeTime({
            ...draft,
            hour: hourFromPosition(position, isInner),
          }),
        );
      } else if (stage === 'minute') {
        const snapped = snapMinute(
          { ...draft, minute: position },
          minuteInterval,
        );
        applyDraft(snapped);
      } else {
        applyDraft(normalizeTime({ ...draft, second: position }));
      }
    },
    [stage, draft, applyDraft, hourFromPosition, minuteInterval],
  );

  const selectTick = useCallback(
    (position: number, isInner = false) => {
      dragTo(position, isInner);
      // The point of the flow: picking an hour moves you to minutes, picking
      // minutes moves you to seconds when they are shown, and otherwise stops.
      if (stage === 'hour') setStage('minute');
      else if (stage === 'minute' && showSeconds) setStage('second');
    },
    [dragTo, stage, showSeconds],
  );

  // ----- validation ----------------------------------------------------------

  const verdict = useMemo<TimeVerdict>(() => {
    if (selectionMode === 'duration') {
      const total = durationToMinutes(timeToDuration(draft));
      const tooShort = minDuration != null && total < minDuration;
      const tooLong = maxDuration != null && total > maxDuration;
      if (tooShort) return { isAllowed: false, reason: 'before-min' };
      if (tooLong) return { isAllowed: false, reason: 'after-max' };
      return { isAllowed: true, reason: null };
    }
    return resolveTime(draft, constraints, {
      seconds: showSeconds,
      interval: minuteInterval,
    });
  }, [
    selectionMode,
    draft,
    constraints,
    showSeconds,
    minuteInterval,
    minDuration,
    maxDuration,
  ]);

  const rangeInverted =
    selectionMode === 'range' &&
    sameDay &&
    isRange(selected) &&
    selected.end != null &&
    compareTime(selected.end, selected.start) < 0;

  const error = useMemo<string | null>(() => {
    if (rangeInverted) return ERROR_TEXT.endBeforeStart;
    if (verdict.isAllowed) return null;
    if (selectionMode === 'duration') return ERROR_TEXT.durationOutOfRange;
    switch (verdict.reason) {
      case 'before-min':
      case 'after-max':
      case 'off-interval':
        return ERROR_TEXT.outOfRange;
      default:
        return ERROR_TEXT.disabled;
    }
  }, [rangeInverted, verdict, selectionMode]);

  // ----- actions -------------------------------------------------------------

  const setNow = useCallback(
    () => {
      const snapped = snapMinute(nowTarget, minuteInterval);
      if (selectionMode === 'duration') {
        applyDraft(snapped);
        return;
      }
      // Land on the nearest *allowed* time: pressing اکنون at 20:00 with
      // business-hours constraints should give 17:00, not a rejected value.
      const allowed = nearestAllowedTime(snapped, constraints, {
        interval: minuteInterval,
        seconds: showSeconds,
      });
      applyDraft(allowed ?? snapped);
      setStage('hour');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      nowKey,
      minuteInterval,
      constraints,
      showSeconds,
      selectionMode,
      applyDraft,
    ],
  );

  const clear = useCallback(() => {
    setSelected(null);
    setStage('hour');
    setEndpoint('start');
    if (!isControlled) setInternalCommitted(null);
    // A cleared value is a change like any other, so instant mode reports it.
    // `confirm` mode waits, as it does for everything else.
    if (mode === 'instant') onChange?.(MIDNIGHT);
  }, [isControlled, mode, onChange]);

  const confirm = useCallback((): TimeSelection => {
    if (!verdict.isAllowed || rangeInverted) return null;

    let result = selected;
    // A range with only a start commits as a zero-length range, mirroring how
    // the date picker commits a single-day range.
    if (selectionMode === 'range' && isRange(result) && result.end == null) {
      result = { start: result.start, end: result.start };
      setSelected(result);
    }
    // Nothing staged yet: commit whatever the hands are showing, which is what
    // a user pressing تأیید straight after opening plainly means.
    if (result === null) {
      result =
        selectionMode === 'duration'
          ? timeToDuration(draft)
          : selectionMode === 'range'
            ? { start: draft, end: draft }
            : draft;
      setSelected(result);
    }
    if (result) commit(result);
    return result;
  }, [verdict, rangeInverted, selected, selectionMode, draft, commit]);

  const reset = useCallback(() => {
    setSelected(committed);
    setStage('hour');
    setEndpoint('start');
  }, [committed]);

  // ----- display -------------------------------------------------------------

  const displayText = useMemo(
    () =>
      formatTime(draft, {
        format: activeFormat,
        showSeconds,
      }),
    [draft, activeFormat, showSeconds],
  );

  const fields = useMemo(
    () => ({
      hour: toPersianDigits(
        String(is24 ? draft.hour : to12Hour(draft.hour)).padStart(2, '0'),
      ),
      minute: toPersianDigits(String(draft.minute).padStart(2, '0')),
      second: toPersianDigits(String(draft.second).padStart(2, '0')),
    }),
    [draft, is24],
  );

  return {
    draft,
    selected,
    duration: isDuration(selected)
      ? selected
      : durationFromMinutes(durationToMinutes(timeToDuration(draft))),
    isEmpty,

    format: activeFormat,
    setFormat,
    displayText,
    fields,
    meridiem: meridiemOf(draft),
    setMeridiem,
    view: pickerMode === 'hybrid' ? view : pickerMode,
    setView,
    canSwitchView: pickerMode === 'hybrid',

    stage,
    setStage,
    ticks,
    hands,
    selectTick,
    dragTo,

    setHour,
    setMinute,
    setSecond,
    setTime,
    step,

    selectionMode,
    endpoint,
    setEndpoint,
    range: isRange(selected) ? selected : null,

    verdict,
    error,

    setNow,
    clear,
    confirm,
    reset,
    isConfirmMode: mode === 'confirm',
    canConfirm: verdict.isAllowed && !rangeInverted,
  };
}

/** Assemble one tick, resolving its position from the angle. */
function buildTick(input: {
  value: number;
  position: number;
  label: string;
  angle: number;
  radius: number;
  isInner: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}): ClockTick {
  const { x, y } = polar(input.angle, input.radius);
  return {
    value: input.value,
    position: input.position,
    label: input.label,
    key: `${input.isInner ? 'i' : 'o'}-${input.value}`,
    angle: input.angle,
    x,
    y,
    isInner: input.isInner,
    isSelected: input.isSelected,
    isDisabled: input.isDisabled,
  };
}

const ERROR_TEXT = {
  outOfRange: 'زمان انتخاب‌شده خارج از بازهٔ مجاز است.',
  disabled: 'این زمان قابل انتخاب نیست.',
  endBeforeStart: 'زمان پایان نمی‌تواند پیش از زمان شروع باشد.',
  durationOutOfRange: 'مدت انتخاب‌شده خارج از بازهٔ مجاز است.',
} as const;

/** Re-exported so a consumer building their own UI can compare selections. */
export { isSameTime };
