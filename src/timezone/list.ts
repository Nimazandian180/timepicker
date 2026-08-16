/**
 * Timezone support — optional, and off unless a consumer asks for it.
 *
 * This deliberately does **not** ship a bundled tz database. `Intl` already has
 * one in every browser and Node build this package supports, so shipping
 * another would add tens of kilobytes to a feature most pickers never turn on.
 * Everything here is a thin read over `Intl`.
 *
 * Note what timezone support means for this component: it labels and converts
 * a wall-clock time, it does not change what {@link TimeValue} is. The stored
 * value stays "10:30 in the selected zone" — which is exactly what a form field
 * means by a time, and avoids the trap of silently rebasing a user's input.
 */
import type { TimeValue } from '../core/types';

export interface TimezoneOption {
  /** IANA identifier, e.g. `'Asia/Tehran'`. */
  id: string;
  /** What to show in the selector, e.g. `'تهران (+۰۳:۳۰)'`. */
  label: string;
  /** Offset from UTC in minutes, at the moment it was resolved. */
  offsetMinutes: number;
}

/**
 * A small, sensible default list. Iran first, then the zones an Iranian product
 * most often needs. Any IANA id works — this is a convenience, not a limit.
 */
export const COMMON_TIMEZONES = [
  { id: 'Asia/Tehran', label: 'تهران' },
  { id: 'UTC', label: 'یوتی‌سی' },
  { id: 'Asia/Dubai', label: 'دبی' },
  { id: 'Asia/Istanbul', label: 'استانبول' },
  { id: 'Europe/London', label: 'لندن' },
  { id: 'Europe/Berlin', label: 'برلین' },
  { id: 'America/New_York', label: 'نیویورک' },
  { id: 'America/Los_Angeles', label: 'لس‌آنجلس' },
  { id: 'Asia/Tokyo', label: 'توکیو' },
] as const;

/** Just the ids, widened to `string[]` so a caller can pass their own list. */
export const DEFAULT_TIMEZONE_IDS: readonly string[] = COMMON_TIMEZONES.map(
  (zone) => zone.id,
);

/** The viewer's own timezone, or `'UTC'` where `Intl` cannot say. */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * A zone's offset from UTC in minutes, at `at` (default: now).
 *
 * Resolved through `Intl` rather than a table because offsets move: Tehran was
 * +04:30 in summer until 2022 and is +03:30 year-round since, and any hardcoded
 * number would quietly rot.
 */
export function offsetMinutes(timezone: string, at: Date = new Date()): number {
  try {
    // Format the same instant in the target zone and in UTC, then difference
    // them. `Intl` exposes no offset directly, and this is the standard way.
    const format = (zone: string) =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(at);

    const parse = (text: string) => {
      const [date, clock] = text.split(', ');
      const [month, day, year] = date.split('/').map(Number);
      const [hour, minute, second] = clock.split(':').map(Number);
      return Date.UTC(year, month - 1, day, hour % 24, minute, second);
    };

    return Math.round((parse(format(timezone)) - parse(format('UTC'))) / 60000);
  } catch {
    return 0;
  }
}

/** `+۰۳:۳۰`, `-۰۵:۰۰`, `+۰۰:۰۰` — the offset as a signed label. */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const rest = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${rest}`;
}

/** Turn ids into ready-to-render options, offsets resolved. */
export function resolveTimezones(
  ids: readonly string[] = DEFAULT_TIMEZONE_IDS,
  at: Date = new Date(),
): TimezoneOption[] {
  const names = new Map<string, string>(
    COMMON_TIMEZONES.map((zone) => [zone.id, zone.label]),
  );
  return ids.map((id) => {
    const offset = offsetMinutes(id, at);
    return {
      id,
      label: `${names.get(id) ?? id} (${formatOffset(offset)})`,
      offsetMinutes: offset,
    };
  });
}

/**
 * The same instant expressed in another zone.
 *
 * Offered for consumers who genuinely need to rebase a time — showing a
 * meeting's local start, say. The picker itself never calls it: changing the
 * selected zone relabels the value, it does not move the hands, because a user
 * who typed 10:30 means 10:30.
 */
export function convertTime(
  value: TimeValue,
  from: string,
  to: string,
  at: Date = new Date(),
): TimeValue {
  const delta = offsetMinutes(to, at) - offsetMinutes(from, at);
  const total = value.hour * 60 + value.minute + delta;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return {
    hour: Math.floor(wrapped / 60),
    minute: wrapped % 60,
    second: value.second,
  };
}
