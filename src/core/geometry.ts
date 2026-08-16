/**
 * Clock-face geometry. Pure trigonometry, no DOM — the components ask for
 * positions and angles, they never compute them, so the face can be re-skinned
 * or re-implemented (SVG, canvas, a consumer's own) without touching this.
 *
 * Conventions, fixed once here so nothing downstream has to remember them:
 *
 * - Angles are **degrees clockwise from 12 o'clock**, which is how a clock is
 *   read and how CSS `rotate()` behaves. Screen maths wants radians from the
 *   +x axis, so the conversion happens in exactly one place ({@link polar}).
 * - Positions are **percentages of the face box** (0–100), not pixels, so the
 *   whole face scales with a single CSS size variable and stays responsive with
 *   no measurement and no resize observer.
 * - The face is **not** mirrored under `dir="rtl"`. A clock runs clockwise
 *   everywhere; flipping it would be a bug, not a localisation.
 */

/** Where the numbers sit, as a fraction of the radius. */
export const OUTER_RADIUS = 0.82;
/** The 13–24 ring in 24-hour mode, tucked inside the outer one. */
export const INNER_RADIUS = 0.56;

const DEG_PER_TURN = 360;

/** Positive modulo, so an angle of -90° reads as 270°. */
const mod = (value: number, by: number): number => ((value % by) + by) % by;

/**
 * The angle a value sits at, given how many steps make a full turn.
 *
 * `angleForValue(3, 12)` is 90° (3 o'clock), `angleForValue(30, 60)` is 180°
 * (half past). Values beyond `steps` wrap, so hour 15 lands on the same spoke
 * as hour 3 — which is exactly what the 24-hour inner ring needs.
 */
export function angleForValue(value: number, steps: number): number {
  return mod((value / steps) * DEG_PER_TURN, DEG_PER_TURN);
}

/**
 * The value an angle points at, rounded to the nearest step.
 *
 * The result is taken modulo `steps`, so 360° comes back as 0 rather than 12 or
 * 60. Callers that display 12 for 0 (the hour ring) map it themselves.
 */
export function valueForAngle(angle: number, steps: number): number {
  const normalized = mod(angle, DEG_PER_TURN);
  return Math.round((normalized / DEG_PER_TURN) * steps) % steps;
}

/**
 * Position of a point at `angle` and `radius`, as percentages of the box.
 *
 * `radius` is a fraction of the face's half-width, so 1 touches the rim and 0
 * is dead centre. The -90° turn moves 0° from the +x axis (3 o'clock, the
 * maths convention) to the top of the face (12 o'clock, the clock convention).
 */
export function polar(angle: number, radius: number): { x: number; y: number } {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: 50 + Math.cos(radians) * radius * 50,
    y: 50 + Math.sin(radians) * radius * 50,
  };
}

/**
 * The angle from the centre of a box to a pointer position — the inverse of
 * {@link polar}, used while dragging a hand.
 *
 * Takes the centre and the pointer in the *same* coordinate space (both client
 * pixels, typically), so the caller measures the face once per gesture rather
 * than per move event.
 */
export function angleForPoint(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
): number {
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  // atan2 gives radians from the +x axis; +90 rotates it back to 12 o'clock.
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return mod(degrees, DEG_PER_TURN);
}

/**
 * How far a pointer is from the centre, as a fraction of the half-width.
 *
 * The 24-hour face needs this to tell an outer-ring hour (1–12) from an inner
 * one (13–24): the same angle means two different hours depending on how deep
 * into the face the pointer is.
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
 * Whether a pointer at `radius` is picking the inner ring.
 *
 * The cut sits between the two rings rather than at either one, so the boundary
 * is equally forgiving on both sides — important on touch, where the pointer is
 * a fingertip and not a pixel.
 */
export function isInnerRing(radius: number): boolean {
  return radius < (OUTER_RADIUS + INNER_RADIUS) / 2;
}
