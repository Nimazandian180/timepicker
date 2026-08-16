import { describe, expect, it } from 'vitest';

import {
  angleForPoint,
  angleForValue,
  INNER_RADIUS,
  isInnerRing,
  OUTER_RADIUS,
  polar,
  radiusForPoint,
  valueForAngle,
} from './geometry';

/** Positions are floats; compare them the way a renderer would care about. */
const near = (value: number, expected: number) =>
  expect(value).toBeCloseTo(expected, 5);

describe('angleForValue', () => {
  it('puts 12 o’clock at the top', () => {
    expect(angleForValue(0, 12)).toBe(0);
  });

  it('walks clockwise', () => {
    expect(angleForValue(3, 12)).toBe(90);
    expect(angleForValue(6, 12)).toBe(180);
    expect(angleForValue(9, 12)).toBe(270);
  });

  it('wraps values past a full turn onto the same spoke', () => {
    expect(angleForValue(15, 12)).toBe(angleForValue(3, 12));
  });

  it('works for the 60-step minute ring', () => {
    expect(angleForValue(30, 60)).toBe(180);
    expect(angleForValue(15, 60)).toBe(90);
  });
});

describe('valueForAngle', () => {
  it('inverts angleForValue', () => {
    for (let value = 0; value < 12; value += 1) {
      expect(valueForAngle(angleForValue(value, 12), 12)).toBe(value);
    }
  });

  it('rounds to the nearest step', () => {
    expect(valueForAngle(89, 12)).toBe(3);
    expect(valueForAngle(91, 12)).toBe(3);
    expect(valueForAngle(104, 12)).toBe(3);
    expect(valueForAngle(106, 12)).toBe(4);
  });

  it('brings a full turn back to zero, not to 12', () => {
    expect(valueForAngle(360, 12)).toBe(0);
    expect(valueForAngle(359, 60)).toBe(0);
  });

  it('handles negative angles', () => {
    expect(valueForAngle(-90, 12)).toBe(9);
  });
});

describe('polar', () => {
  it('puts the centre at 50/50', () => {
    const { x, y } = polar(0, 0);
    near(x, 50);
    near(y, 50);
  });

  it('places 0° at the top of the box', () => {
    const { x, y } = polar(0, 1);
    near(x, 50);
    near(y, 0);
  });

  it('places 90° on the right and 270° on the left', () => {
    near(polar(90, 1).x, 100);
    near(polar(90, 1).y, 50);
    near(polar(270, 1).x, 0);
  });

  it('scales with the radius fraction', () => {
    near(polar(0, 0.5).y, 25);
  });
});

describe('angleForPoint', () => {
  it('inverts polar for the cardinal directions', () => {
    // Face spanning 0..100 in both axes, so the centre is (50, 50).
    expect(angleForPoint(50, 50, 50, 0)).toBeCloseTo(0, 5); // straight up
    expect(angleForPoint(50, 50, 100, 50)).toBeCloseTo(90, 5); // right
    expect(angleForPoint(50, 50, 50, 100)).toBeCloseTo(180, 5); // down
    expect(angleForPoint(50, 50, 0, 50)).toBeCloseTo(270, 5); // left
  });

  it('never returns a negative angle', () => {
    expect(angleForPoint(50, 50, 40, 40)).toBeGreaterThanOrEqual(0);
  });

  it('round-trips a dragged pointer back to the value under it', () => {
    // Pointer dropped on the 4 o'clock spoke of a 200px face.
    const { x, y } = polar(angleForValue(4, 12), OUTER_RADIUS);
    const angle = angleForPoint(100, 100, x * 2, y * 2);
    expect(valueForAngle(angle, 12)).toBe(4);
  });
});

describe('radiusForPoint / isInnerRing', () => {
  it('is 0 at the centre and 1 at the rim', () => {
    expect(radiusForPoint(100, 100, 100, 100, 100)).toBe(0);
    expect(radiusForPoint(100, 100, 200, 100, 100)).toBe(1);
  });

  it('guards against a zero-sized face', () => {
    expect(radiusForPoint(0, 0, 10, 10, 0)).toBe(0);
  });

  it('splits the two rings midway between them', () => {
    expect(isInnerRing(INNER_RADIUS)).toBe(true);
    expect(isInnerRing(OUTER_RADIUS)).toBe(false);
    expect(isInnerRing((INNER_RADIUS + OUTER_RADIUS) / 2 - 0.01)).toBe(true);
    expect(isInnerRing((INNER_RADIUS + OUTER_RADIUS) / 2 + 0.01)).toBe(false);
  });
});
