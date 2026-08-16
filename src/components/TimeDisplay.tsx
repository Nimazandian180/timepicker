'use client';

/**
 * The prominent reading at the top — `۱۰:۳۰ ق.ظ`.
 *
 * Each unit is a button that jumps the clock to that stage. That is the only
 * way back to the hour once the picker has advanced to minutes, and it is where
 * every clock UI puts it, so it needs no explaining.
 */
import { MERIDIEM_LABELS, MERIDIEM_LABELS_LONG } from '../core/constants';
import type { ClockStage, Meridiem, TimeFormat } from '../core/types';
import { cn } from '../utils/cn';
import styles from './JalaliTimePicker.module.css';

export interface TimeDisplayProps {
  /** The three units as display text. */
  fields: { hour: string; minute: string; second: string };
  stage: ClockStage;
  onStage: (stage: ClockStage) => void;
  format: TimeFormat;
  showSeconds?: boolean;
  meridiem: Meridiem;
  onMeridiem: (meridiem: Meridiem) => void;
  /** Hide the ق.ظ/ب.ظ pills even in 12-hour mode. */
  showMeridiem?: boolean;
  /** The full reading, for the screen reader — the units alone read as noise. */
  label: string;
}

export function TimeDisplay({
  fields,
  stage,
  onStage,
  format,
  showSeconds = false,
  meridiem,
  onMeridiem,
  showMeridiem = true,
  label,
}: TimeDisplayProps) {
  const unit = (key: ClockStage, text: string) => (
    <button
      type="button"
      className={cn(
        styles.displayUnit,
        stage === key && styles.displayUnitActive,
      )}
      // A pressed state, not just a colour: the active unit has to be
      // detectable without seeing the difference between two greys.
      aria-pressed={stage === key}
      onClick={() => onStage(key)}
    >
      {text}
    </button>
  );

  return (
    <div className={styles.display}>
      {/* One live region carrying the whole reading. Without it a screen reader
          hears three unrelated numbers change; with it, "۱۰:۳۰ ق.ظ". */}
      <span className={styles.displayTime} dir="ltr">
        <span className={styles.srOnly} aria-live="polite">
          {label}
        </span>
        <span aria-hidden="true">
          {unit('hour', fields.hour)}
          <span className={styles.displaySeparator}>:</span>
          {unit('minute', fields.minute)}
          {showSeconds && (
            <>
              <span className={styles.displaySeparator}>:</span>
              {unit('second', fields.second)}
            </>
          )}
        </span>
      </span>

      {format === '12h' && showMeridiem && (
        <div
          className={styles.meridiem}
          role="radiogroup"
          aria-label="قبل یا بعد از ظهر"
        >
          {(['am', 'pm'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={meridiem === value}
              aria-label={MERIDIEM_LABELS_LONG[value]}
              className={cn(
                styles.meridiemButton,
                meridiem === value && styles.meridiemButtonActive,
              )}
              onClick={() => onMeridiem(value)}
            >
              {MERIDIEM_LABELS[value]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
