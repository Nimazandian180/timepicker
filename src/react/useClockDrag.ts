'use client';

/**
 * Pointer handling for the clock face — click, tap and drag, in one gesture
 * model.
 *
 * Everything runs on Pointer Events, so mouse, touch and pen take the same code
 * path; there is no separate touch branch to fall out of sync. Two details do
 * the real work:
 *
 *  - `setPointerCapture` on the face means a drag keeps tracking after the
 *    finger leaves the circle, and still ends correctly if it is released
 *    outside. Without it, dragging past the rim silently drops the gesture.
 *  - `touch-action: none` (set in CSS on the face) stops the browser treating a
 *    drag on the clock as a page scroll. On mobile that is the difference
 *    between a usable clock and one that scrolls the page whenever you try to
 *    set the time.
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
  /** How many steps a full turn is divided into: 12 for hours, 60 otherwise. */
  steps: number;
  /** True when the face has a second, inner ring (24-hour mode). */
  hasInnerRing: boolean;
  /** Called continuously while dragging. */
  onDrag: (value: number, isInner: boolean) => void;
  /** Called once when the pointer is released — this is what advances the stage. */
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
  // The last value seen, so pointerup can commit it without re-reading the DOM.
  const last = useRef<{ value: number; isInner: boolean } | null>(null);

  /** Turn a pointer position into a clock value, relative to the face's box. */
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
      // Ignore secondary buttons: a right-click on the clock should open the
      // context menu, not set the time.
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
      // Skip identical readings so a slow drag inside one step does not push a
      // state update per pixel.
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
      // A cancelled gesture (the OS took over, the element was removed) keeps
      // whatever the drag already applied but must not advance the stage.
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
