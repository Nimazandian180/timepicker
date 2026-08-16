const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Replace Latin digits (0–9) in a string/number with Persian digits (۰–۹). */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(
    /[0-9]/g,
    (digit) => PERSIAN_DIGITS[Number(digit)],
  );
}

/**
 * Fold Persian (۰–۹) and Arabic-Indic (٠–٩) digits back to Latin (0–9), leaving
 * every other character untouched. Kept local to the feature so it carries no
 * dependency on the host app's shared utilities.
 *
 * This is what lets the digital inputs accept whatever the user's keyboard
 * produces — a Persian keyboard types ۱۲, a Latin one types 12, and both have
 * to parse to the same number.
 */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/**
 * Pad a number to two digits, or leave it bare.
 *
 * `leadingZero` is a display setting (`09:05` vs `9:05`) that applies to hours
 * only — minutes and seconds are always padded, because `9:5` is not a time
 * anybody writes.
 */
export function pad2(value: number, leadingZero = true): string {
  const text = String(Math.abs(Math.trunc(value)));
  return leadingZero && text.length < 2 ? `0${text}` : text;
}
