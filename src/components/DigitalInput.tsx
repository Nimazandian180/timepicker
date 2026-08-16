'use client';

/**
 * The typable side of the picker: an hour, minute and optional second box, each
 * with increment/decrement controls.
 *
 * The subtle part is that a field must hold *invalid intermediate text* while
 * someone types. Typing `14` into an hour box means passing through `1`, and a
 * field that immediately normalised each keystroke would fight the user (`1` →
 * `01`, caret moved, next keystroke appends to the wrong place). So each box
 * keeps its own draft string while focused, and only commits on blur or Enter —
 * at which point out-of-range input is clamped rather than rejected outright.
 */
import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

import { UNIT_LABELS } from '../core/constants';
import type { ClockStage } from '../core/types';
import { parseField } from '../format/parse';
import { toPersianDigits } from '../format/digits';
import { cn } from '../utils/cn';
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
  const [invalid, setInvalid] = useState(false);

  const commit = (text: string) => {
    const parsed = parseField(text);
    setDraft(null);
    if (parsed === null) {
      // An empty or unparseable box reverts rather than becoming 0 — nobody
      // tabbing through a form means "midnight" by clearing the hour.
      setInvalid(false);
      return;
    }
    setInvalid(false);
    onCommit(Math.min(max, Math.max(min, parsed)));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setDraft(text);
    const parsed = parseField(text);
    // Flag out-of-range input as it is typed, but do not block it: the user may
    // be mid-way through a number that will end up valid.
    setInvalid(text !== '' && (parsed === null || parsed > max));
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
      setInvalid(false);
    }
  };

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={`jtp-${unit}`}>
        {UNIT_LABELS[unit]}
      </label>
      <input
        id={`jtp-${unit}`}
        className={cn(styles.fieldInput, invalid && styles.fieldInvalid)}
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
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={draft ?? value}
        onChange={handleChange}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(event) => event.target.select()}
      />
      <div className={styles.fieldStepper}>
        <button
          type="button"
          className={styles.stepButton}
          aria-label={`افزایش ${UNIT_LABELS[unit]}`}
          disabled={disabled}
          onClick={() => onStep(1)}
        >
          <ChevronUpIcon className={styles.stepIcon} />
        </button>
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
    </div>
  );
}

export interface DigitalInputProps {
  /** The three fields as display text. */
  fields: { hour: string; minute: string; second: string };
  /** 12-hour boxes accept 1–12; 24-hour boxes accept 0–23. */
  is12Hour: boolean;
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
  showSeconds = false,
  onHour,
  onMinute,
  onSecond,
  onStep,
  disabled,
  maxHour,
}: DigitalInputProps) {
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
      {showSeconds && (
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
