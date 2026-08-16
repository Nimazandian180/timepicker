'use client';

/**
 * Pointer handling for the clock face — tap and drag in one gesture model,
 * mouse/touch/pen on one code path.
 *
 * Pointer capture keeps a drag tracking after the finger leaves the circle;
 * `touch-action: none` (set on the face in CSS) stops the browser treating that
 * drag as a page scroll.
 */
import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import {
  angleForPoint,
  isInnerRing,
  radiusForPoint,
  valueForAngle,
} from '../core/geometry';

export interface UseClockDragOptions {
  /** Steps in a full turn: 12 for hours, 60 otherwise. */
  steps: number;
  /** True when the face has an inner 13–24 ring (24-hour mode). */
  hasInnerRing: boolean;
  /** Fires continuously while dragging. */
  onDrag: (value: number, isInner: boolean) => void;
  /** Fires once on release — this is what advances the stage. */
  onCommit: (value: number, isInner: boolean) => void;
}

export interface ClockDragHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

export function useClockDrag({
  steps,
  hasInnerRing,
  onDrag,
  onCommit,
}: UseClockDragOptions): ClockDragHandlers {
  const dragging = useRef(false);
  const last = useRef<{ value: number; isInner: boolean } | null>(null);

  const read = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const angle = angleForPoint(
        centerX,
        centerY,
        event.clientX,
        event.clientY,
      );
      const value = valueForAngle(angle, steps);
      const radius = hasInnerRing
        ? radiusForPoint(
            centerX,
            centerY,
            event.clientX,
            event.clientY,
            box.width / 2,
          )
        : 0;
      return { value, isInner: hasInnerRing && isInnerRing(radius) };
    },
    [steps, hasInnerRing],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // A right-click should open the context menu, not set the time.
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragging.current = true;
      const reading = read(event);
      last.current = reading;
      onDrag(reading.value, reading.isInner);
    },
    [read, onDrag],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragging.current) return;
      const reading = read(event);
      // Skip identical readings: no state update per pixel.
      if (
        last.current &&
        last.current.value === reading.value &&
        last.current.isInner === reading.isInner
      ) {
        return;
      }
      last.current = reading;
      onDrag(reading.value, reading.isInner);
    },
    [read, onDrag],
  );

  const finish = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      const reading = last.current ?? read(event);
      last.current = null;
      onCommit(reading.value, reading.isInner);
    },
    [read, onCommit],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      // A cancelled gesture keeps what the drag applied but must not advance.
      dragging.current = false;
      last.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel,
  };
}
