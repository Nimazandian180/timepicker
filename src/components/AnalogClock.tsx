'use client';

/**
 * The clock face: ticks, hand, drag and keyboard.
 *
 * Every tick is a real `<button>` so a tap works, and the face handles drag so
 * the hand can be swept round. For the keyboard the face is a single focusable
 * `radiogroup` — tabbing through 60 minute ticks would be unusable — with the
 * ticks out of the tab order, the standard radio-set pattern.
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
  /** Which unit is being selected — the one the single hand points at. */
  stage: ClockStage;
  format: TimeFormat;
  /**
   * Commit a dial *position* and advance the stage. Positions, not values: a
   * drag reads an angle, and `isInner` separates hour 3 from hour 15.
   */
  onSelect: (position: number, isInner?: boolean) => void;
  /** Update while dragging, without advancing. Same position space. */
  onDrag: (position: number, isInner?: boolean) => void;
  /** Arrow keys move by this much in the minute stage. */
  step?: number;
  className?: string;
}

export function AnalogClock({
  ticks,
  hands,
  stage,
  format,
  onSelect,
  onDrag,
  step = 1,
  className,
}: AnalogClockProps) {
  // 24-hour mode is the only case with two hour rings to tell apart.
  const hasInnerRing = stage === 'hour' && format === '24h';
  const steps = stage === 'hour' ? HOUR_TICKS_12 : MINUTES_PER_HOUR;

  // Suppresses the hand's easing mid-gesture: a hand lagging the finger reads
  // as broken, while the same easing between two taps reads as responsive.
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

  // Anchored at `bottom: 50%`, so reaching radius fraction `r` means height
  // `r * 50%`. Tying length to the ring is what puts the knob on the number.
  const handHeight = (radius: number) => `${radius * 50}%`;

  const isHourStage = stage === 'hour';
  // The one hand points at whichever unit is being selected.
  const handAngle =
    stage === 'hour'
      ? hands.hour
      : stage === 'minute'
        ? hands.minute
        : hands.second;
  // It only reaches the inner ring for an inner-ring hour (13–24 on the
  // 24-hour face); the minute and second rings are always the outer one.
  const handRadius =
    isHourStage && hands.hourIsInner ? INNER_RADIUS : OUTER_RADIUS;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const unitStep = stage === 'hour' ? 1 : step;
    // A clock is not mirrored under RTL: Right always means clockwise.
    const delta =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? unitStep
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -unitStep
          : 0;

    if (delta !== 0) {
      event.preventDefault();
      // Position space, so the arrows walk round the current ring.
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

        {/* Exactly one hand, for whatever is being selected: here a hand means
            "this is your choice", so an idle one is just another needle to
            mistake for it. Drawn under the ticks so a tap hits the number. */}
        <span
          className={cn(styles.hand, isDragging && styles.handDragging)}
          style={{
            height: handHeight(handRadius),
            transform: `translateX(-50%) rotate(${handAngle}deg)`,
          }}
        >
          <span className={styles.handKnob} />
        </span>

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
            // A tap was already resolved by the face's drag gesture; handling
            // the click too would select twice and skip a stage. `detail === 0`
            // marks the assistive-tech click the gesture never sees.
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
