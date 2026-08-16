'use client';

/**
 * The clock face: ticks, hands, drag and keyboard.
 *
 * Two input models are layered on the same state, because they suit different
 * users and neither is a fallback for the other:
 *
 *  - **Pointer** — every tick is a real `<button>`, so a plain tap works; the
 *    face itself also handles drag, so a hand can be swept round continuously.
 *  - **Keyboard** — the face is a single focusable `radiogroup`; arrows step
 *    the value, Enter/Space commit and advance the stage. Tabbing through 60
 *    minute ticks would be unusable, so the ticks stay out of the tab order and
 *    the group owns the focus, which is the standard pattern for a radio set.
 */
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import {
  HOUR_TICKS_12,
  MINUTES_PER_HOUR,
  UNIT_LABELS,
} from '../core/constants';
import { INNER_RADIUS, OUTER_RADIUS } from '../core/geometry';
import type { ClockStage, ClockTick, TimeFormat } from '../core/types';
import { useClockDrag } from '../react/useClockDrag';
import type { ClockHands } from '../react/useJalaliTimePicker';
import { cn } from '../utils/cn';
import styles from './JalaliTimePicker.module.css';

export interface AnalogClockProps {
  /** Positioned ticks for the current stage, from the hook. */
  ticks: readonly ClockTick[];
  /** Hand rotations, in degrees. */
  hands: ClockHands;
  stage: ClockStage;
  format: TimeFormat;
  /** Draw the seconds hand. */
  showSeconds?: boolean;
  /**
   * Commit a dial *position* and advance the stage (a tap, or the end of a
   * drag). Positions, not values: a drag can only read an angle, and on a
   * 24-hour face `isInner` is what separates hour 3 from hour 15.
   */
  onSelect: (position: number, isInner?: boolean) => void;
  /** Update while dragging, without advancing. Same position space. */
  onDrag: (position: number, isInner?: boolean) => void;
  /** Arrow keys move by this much in the minute/second stages. */
  step?: number;
  className?: string;
}

export function AnalogClock({
  ticks,
  hands,
  stage,
  format,
  showSeconds = false,
  onSelect,
  onDrag,
  step = 1,
  className,
}: AnalogClockProps) {
  // 24-hour mode is the only case with two hour rings to tell apart.
  const hasInnerRing = stage === 'hour' && format === '24h';
  const steps = stage === 'hour' ? HOUR_TICKS_12 : MINUTES_PER_HOUR;

  // Suppresses the hands' transition mid-gesture: an eased hand lagging behind
  // the finger feels broken, while the same easing between two taps feels good.
  const [isDragging, setIsDragging] = useState(false);

  const drag = useClockDrag({
    steps,
    hasInnerRing,
    onDrag: (value, isInner) => {
      setIsDragging(true);
      onDrag(value, isInner);
    },
    onCommit: (value, isInner) => {
      setIsDragging(false);
      onSelect(value, isInner);
    },
  });

  const selected = ticks.find((tick) => tick.isSelected) ?? null;

  /**
   * A hand's length as a percentage of the face's height.
   *
   * The hand is anchored at `bottom: 50%` (the dial's centre), so reaching a
   * radius fraction `r` of the half-width means a height of `r * 50%`. Tying
   * the length to the ring radius — rather than fixing it in CSS — is what puts
   * the knob under the number it points at, on either ring.
   */
  const handHeight = (radius: number) => `${radius * 50}%`;

  // The hour hand reaches the inner ring only while an inner-ring hour is
  // selected; everything else points at the outer ring.
  const hourRadius =
    stage === 'hour'
      ? selected?.isInner
        ? INNER_RADIUS
        : OUTER_RADIUS
      : hands.hourIsInner
        ? INNER_RADIUS
        : OUTER_RADIUS;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const unitStep = stage === 'hour' ? 1 : step;
    // Under dir="rtl" the browser does not flip arrow *keys*, and a clock is not
    // mirrored anyway: Right always means clockwise here, which matches the
    // direction the hand visibly travels.
    const delta =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? unitStep
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -unitStep
          : 0;

    if (delta !== 0) {
      event.preventDefault();
      // Stepping happens in position space, so on a 24-hour face the arrows
      // walk round the ring the selection is already on rather than jumping
      // between the two.
      const current = selected?.position ?? 0;
      const next = (((current + delta) % steps) + steps) % steps;
      onDrag(next, selected?.isInner);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(selected?.position ?? 0, selected?.isInner);
    }
  };

  return (
    <div className={cn(styles.clockRoot, className)}>
      <div
        className={styles.face}
        role="radiogroup"
        tabIndex={0}
        aria-label={`انتخاب ${UNIT_LABELS[stage]}`}
        onKeyDown={handleKeyDown}
        {...drag}
      >
        <span className={styles.center} />

        {/* Hands are drawn under the ticks so a tap always hits the number. */}
        <span
          className={cn(styles.hand, isDragging && styles.handDragging)}
          style={{
            height: handHeight(hourRadius),
            transform: `translateX(-50%) rotate(${hands.hour}deg)`,
          }}
        >
          {stage === 'hour' && <span className={styles.handKnob} />}
        </span>

        <span
          className={cn(styles.hand, isDragging && styles.handDragging)}
          style={{
            height: handHeight(OUTER_RADIUS),
            transform: `translateX(-50%) rotate(${hands.minute}deg)`,
          }}
        >
          {stage === 'minute' && <span className={styles.handKnob} />}
        </span>

        {showSeconds && (
          <span
            className={cn(
              styles.hand,
              styles.handSecond,
              isDragging && styles.handDragging,
            )}
            style={{
              height: handHeight(OUTER_RADIUS),
              transform: `translateX(-50%) rotate(${hands.second}deg)`,
            }}
          >
            {stage === 'second' && <span className={styles.handKnob} />}
          </span>
        )}

        {ticks.map((tick) => (
          <button
            key={tick.key}
            type="button"
            role="radio"
            aria-checked={tick.isSelected}
            // The label spells the unit out, since "۳" alone tells a screen
            // reader nothing about whether it is an hour or a minute.
            aria-label={`${tick.label} ${UNIT_LABELS[stage]}`}
            disabled={tick.isDisabled}
            // Out of the tab order on purpose: the group is the tab stop.
            tabIndex={-1}
            className={cn(
              styles.tick,
              tick.isInner && styles.tickInner,
              tick.isSelected && styles.tickSelected,
            )}
            style={{ left: `${tick.x}%`, top: `${tick.y}%` }}
            // A tick sits *inside* the face's drag surface, so a real tap has
            // already been resolved from the pointer's angle and committed by
            // the gesture — handling the click too would select twice and skip
            // a stage. `detail === 0` marks a click with no pointer behind it,
            // which is exactly the assistive-technology / `.click()` case that
            // the gesture never sees.
            onClick={(event) => {
              if (event.detail !== 0) return;
              onSelect(tick.position, tick.isInner);
            }}
          >
            {tick.label}
          </button>
        ))}
      </div>
    </div>
  );
}
