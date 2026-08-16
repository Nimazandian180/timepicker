/**
 * Optional timezone support, a thin read over `Intl` — no bundled tz database,
 * since `Intl` already has one everywhere this package runs.
 *
 * It labels and converts a wall-clock time; it does not change what a
 * {@link TimeValue} is. The stored value stays "10:30 in the selected zone".
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

/** A default list; any IANA id works, so this is convenience, not a limit. */
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
 * A zone's offset from UTC in minutes. Resolved through `Intl` rather than a
 * table because offsets move — Tehran dropped DST in 2022.
 */
export function offsetMinutes(timezone: string, at: Date = new Date()): number {
  try {
    // `Intl` exposes no offset directly: format the same instant in both
    // zones and difference them.
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
 * The same instant in another zone. The picker never calls this — changing the
 * zone relabels the value rather than moving the hands, because a user who
 * typed 10:30 means 10:30. Offered for consumers who must rebase deliberately.
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
