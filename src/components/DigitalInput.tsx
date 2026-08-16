'use client';

/**
 * The typable side of the picker: an hour, minute and optional second box, each
 * with increment/decrement controls.
 *
 * Two rules shape the typing model, and they pull in opposite directions:
 *
 *  - **A box must hold intermediate text.** Typing `14` into an hour box passes
 *    through `1`, and a field that normalised every keystroke would fight the
 *    user (`1` → `01`, caret moved, next keystroke lands in the wrong place).
 *    So each box keeps its own draft string while focused and only commits on
 *    blur or Enter.
 *  - **A box must never hold an impossible number.** An hour cannot reach 24,
 *    a minute or a second cannot reach 60, so a keystroke that would take the
 *    box past its maximum is simply refused: the text does not change and there
 *    is nothing to clamp later. Non-digits are refused the same way.
 *
 * Together those mean the draft is always a *prefix of a valid value* — `1` on
 * the way to `14` is fine, `25` never appears at all.
 */
import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

import { UNIT_LABELS } from '../core/constants';
import type { ClockStage, TimePrecision } from '../core/types';
import { parseField } from '../format/parse';
import { resolvePrecision } from '../format/format';
import { toLatinDigits, toPersianDigits } from '../format/digits';
import { ChevronDownIcon, ChevronUpIcon } from './icons';
import styles from './JalaliTimePicker.module.css';

interface FieldProps {
  unit: ClockStage;
  /** The committed value, as display text (Persian digits, padded). */
  value: string;
  /** The largest number this box accepts; the smallest is always 0 (or 1 in 12h). */
  max: number;
  min?: number;
  /** Commit a typed number. */
  onCommit: (value: number) => void;
  /** Nudge by one step in either direction. */
  onStep: (delta: number) => void;
  disabled?: boolean;
}

function Field({
  unit,
  value,
  max,
  min = 0,
  onCommit,
  onStep,
  disabled,
}: FieldProps) {
  // `null` means "not editing" — the box shows the committed value.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string) => {
    const parsed = parseField(text);
    setDraft(null);
    // An empty box reverts rather than becoming 0 — nobody tabbing through a
    // form means "midnight" by clearing the hour. Anything else is already in
    // range by construction; `min` is the one bound typing cannot enforce,
    // since `0` is a legitimate prefix of `09` in a 1–12 box.
    if (parsed === null) return;
    onCommit(Math.min(max, Math.max(min, parsed)));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    if (text === '') {
      setDraft('');
      return;
    }
    // Digits only, in whichever script was typed — anything else is refused
    // outright rather than flagged, so the box cannot hold junk.
    if (!/^[0-9۰-۹٠-٩]+$/.test(text)) return;
    // The maximum's own width is the cap: a two-digit box takes two digits, and
    // a third keystroke is dropped instead of silently replacing the number.
    if (toLatinDigits(text).length > String(max).length) return;
    const parsed = parseField(text);
    if (parsed === null || parsed > max) return;
    setDraft(text);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onStep(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onStep(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commit(event.currentTarget.value);
    } else if (event.key === 'Escape') {
      // Abandon the edit and fall back to the committed value.
      setDraft(null);
    }
  };

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`jtp-${unit}`}>
        {UNIT_LABELS[unit]}
      </label>
      <button
        type="button"
        className={styles.stepButton}
        aria-label={`افزایش ${UNIT_LABELS[unit]}`}
        disabled={disabled}
        onClick={() => onStep(1)}
      >
        <ChevronUpIcon className={styles.stepIcon} />
      </button>
      <input
        id={`jtp-${unit}`}
        className={styles.fieldInput}
        // `text` rather than `number`: a number input rejects Persian digits
        // outright, and its own spinners cannot honour the minute interval.
        type="text"
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        role="spinbutton"
        aria-label={UNIT_LABELS[unit]}
        aria-valuenow={parseField(value) ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        // The box cannot hold an out-of-range number, so `maxLength` is belt
        // and braces — but it also stops a paste before `onChange` sees it.
        maxLength={String(max).length}
        disabled={disabled}
        value={draft ?? value}
        onChange={handleChange}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(event) => event.target.select()}
      />
      <button
        type="button"
        className={styles.stepButton}
        aria-label={`کاهش ${UNIT_LABELS[unit]}`}
        disabled={disabled}
        onClick={() => onStep(-1)}
      >
        <ChevronDownIcon className={styles.stepIcon} />
      </button>
    </div>
  );
}

export interface DigitalInputProps {
  /** The three fields as display text. */
  fields: { hour: string; minute: string; second: string };
  /** 12-hour boxes accept 1–12; 24-hour boxes accept 0–23. */
  is12Hour: boolean;
  /** Which boxes to show: `'hour'`, `'minute'` (default) or `'second'`. */
  precision?: TimePrecision;
  /** Shorthand for `precision: 'second'`. */
  showSeconds?: boolean;
  onHour: (hour: number) => void;
  onMinute: (minute: number) => void;
  onSecond: (second: number) => void;
  onStep: (unit: ClockStage, delta: number) => void;
  disabled?: boolean;
  /** Duration mode relabels the boxes and lifts the 23-hour cap. */
  maxHour?: number;
}

export function DigitalInput({
  fields,
  is12Hour,
  precision,
  showSeconds,
  onHour,
  onMinute,
  onSecond,
  onStep,
  disabled,
  maxHour,
}: DigitalInputProps) {
  const shown = resolvePrecision(precision, showSeconds);
  return (
    // Explicitly LTR: `10:30` is a numeric run that must not be reordered, and
    // the hour belongs on the left even inside an RTL card.
    <div className={styles.digital} dir="ltr">
      <Field
        unit="hour"
        value={fields.hour}
        min={is12Hour ? 1 : 0}
        max={maxHour ?? (is12Hour ? 12 : 23)}
        onCommit={onHour}
        onStep={(delta) => onStep('hour', delta)}
        disabled={disabled}
      />
      {shown !== 'hour' && (
        <>
          <span className={styles.fieldSeparator} aria-hidden="true">
            :
          </span>
          <Field
            unit="minute"
            value={fields.minute}
            max={59}
            onCommit={onMinute}
            onStep={(delta) => onStep('minute', delta)}
            disabled={disabled}
          />
        </>
      )}
      {shown === 'second' && (
        <>
          <span className={styles.fieldSeparator} aria-hidden="true">
            :
          </span>
          <Field
            unit="second"
            value={fields.second}
            max={59}
            onCommit={onSecond}
            onStep={(delta) => onStep('second', delta)}
            disabled={disabled}
          />
        </>
      )}
    </div>
  );
}

/** Exported for the duration UI, which reuses the same boxes with new labels. */
export { toPersianDigits };
