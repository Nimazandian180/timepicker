'use client';

/**
 * Range mode's start/end switcher. The active endpoint gets a border *and* a
 * fill — never colour alone, since the two boxes are otherwise identical.
 */
import type { TimeFormatOptions } from '../format/format';
import { formatTime } from '../format/format';
import type { TimeRange } from '../core/types';
import type { RangeEndpoint } from '../react/useJalaliTimePicker';
import { cn } from '../utils/cn';
import styles from './JalaliTimePicker.module.css';

export interface RangeEndpointsProps {
  range: TimeRange | null;
  endpoint: RangeEndpoint;
  onChange: (endpoint: RangeEndpoint) => void;
  formatOptions?: TimeFormatOptions;
}

export function RangeEndpoints({
  range,
  endpoint,
  onChange,
  formatOptions,
}: RangeEndpointsProps) {
  const read = (value: Parameters<typeof formatTime>[0] | null | undefined) =>
    value ? formatTime(value, formatOptions) : '—';

  return (
    <div className={styles.endpoints} role="tablist" aria-label="بازهٔ زمانی">
      <button
        type="button"
        role="tab"
        aria-selected={endpoint === 'start'}
        className={cn(
          styles.endpoint,
          endpoint === 'start' && styles.endpointActive,
        )}
        onClick={() => onChange('start')}
      >
        <span className={styles.endpointLabel}>از</span>
        <span className={styles.endpointValue} dir="ltr">
          {read(range?.start)}
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={endpoint === 'end'}
        className={cn(
          styles.endpoint,
          endpoint === 'end' && styles.endpointActive,
        )}
        onClick={() => onChange('end')}
      >
        <span className={styles.endpointLabel}>تا</span>
        <span className={styles.endpointValue} dir="ltr">
          {read(range?.end)}
        </span>
      </button>
    </div>
  );
}
