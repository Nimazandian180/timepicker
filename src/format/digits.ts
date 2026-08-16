const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Replace Latin digits (0–9) in a string/number with Persian digits (۰–۹). */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(
    /[0-9]/g,
    (digit) => PERSIAN_DIGITS[Number(digit)],
  );
}

/**
 * Fold Persian (۰–۹) and Arabic-Indic (٠–٩) digits back to Latin, leaving
 * everything else alone — so the fields accept whatever keyboard is in use.
 */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/**
 * Pad to two digits, or leave bare. `leadingZero` applies to hours only —
 * minutes and seconds are always padded.
 */
export function pad2(value: number, leadingZero = true): string {
  const text = String(Math.abs(Math.trunc(value)));
  return leadingZero && text.length < 2 ? `0${text}` : text;
}
