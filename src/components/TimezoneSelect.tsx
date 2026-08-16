'use client';

import { useMemo } from 'react';

import { resolveTimezones } from '../timezone/list';
import styles from './JalaliTimePicker.module.css';
import { GlobeIcon } from './icons';

export interface TimezoneSelectProps {
  /** The selected IANA id. */
  value: string;
  onChange: (timezone: string) => void;
  /** Which zones to offer. Defaults to a short common list. */
  options?: readonly string[];
}

/**
 * The optional timezone row. A native `<select>` on purpose: accessible and
 * mobile-friendly for free, for a control most consumers keep switched off.
 */
export function TimezoneSelect({
  value,
  onChange,
  options,
}: TimezoneSelectProps) {
  // Once per option list, not per render: each offset costs an Intl format.
  const zones = useMemo(() => resolveTimezones(options), [options]);

  return (
    <div className={styles.timezone}>
      <GlobeIcon className={styles.timezoneIcon} />
      <select
        className={styles.timezoneSelect}
        aria-label="منطقهٔ زمانی"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {/* Without this, a value outside the list silently resets the select. */}
        {!zones.some((zone) => zone.id === value) && (
          <option value={value}>{value}</option>
        )}
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.label}
          </option>
        ))}
      </select>
    </div>
  );
}
