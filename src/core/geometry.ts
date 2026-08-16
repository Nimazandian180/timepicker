/**
 * Clock-face geometry. Pure trigonometry, no DOM.
 *
 * Angles are degrees clockwise from 12 o'clock (what CSS `rotate()` wants), and
 * positions are percentages of the face box, so the whole face scales with one
 * CSS variable and never needs measuring. The face is not mirrored under RTL —
 * a clock runs clockwise everywhere.
 */

/** Where the numbers sit, as a fraction of the radius. */
export const OUTER_RADIUS = 0.82;
/** The 13–24 ring in 24-hour mode, tucked inside the outer one. */
export const INNER_RADIUS = 0.56;

const DEG_PER_TURN = 360;

const mod = (value: number, by: number): number => ((value % by) + by) % by;

/**
 * The angle a value sits at, given how many steps make a full turn.
 * Values beyond `steps` wrap, so hour 15 shares a spoke with hour 3.
 */
export function angleForValue(value: number, steps: number): number {
  return mod((value / steps) * DEG_PER_TURN, DEG_PER_TURN);
}

/** The value an angle points at, rounded to the nearest step. 360° gives 0. */
export function valueForAngle(angle: number, steps: number): number {
  const normalized = mod(angle, DEG_PER_TURN);
  return Math.round((normalized / DEG_PER_TURN) * steps) % steps;
}

/**
 * Position of a point at `angle` and `radius`, as percentages of the box.
 * `radius` is a fraction of the half-width: 1 touches the rim, 0 is the centre.
 */
export function polar(angle: number, radius: number): { x: number; y: number } {
  // -90° moves 0° from the +x axis to the top of the face.
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 50 + Math.cos(radians) * radius * 50,
    y: 50 + Math.sin(radians) * radius * 50,
  };
}

/**
 * The angle from a box's centre to a pointer — the inverse of {@link polar}.
 * Centre and pointer must be in the same coordinate space.
 */
export function angleForPoint(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
): number {
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return mod(degrees, DEG_PER_TURN);
}

/**
 * How far a pointer is from the centre, as a fraction of the half-width. The
 * 24-hour face needs it to tell an outer-ring hour from an inner one.
 */
export function radiusForPoint(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
  halfSize: number,
): number {
  if (halfSize <= 0) return 0;
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  return Math.hypot(dx, dy) / halfSize;
}

/**
 * Whether a pointer at `radius` is picking the inner ring. The cut sits midway
 * between the rings, so the boundary is equally forgiving on both sides.
 */
export function isInnerRing(radius: number): boolean {
  return radius < (OUTER_RADIUS + INNER_RADIUS) / 2;
}
