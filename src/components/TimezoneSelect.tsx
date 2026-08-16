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
 * The optional timezone row. A native `<select>` on purpose: it is keyboard
 * accessible, screen-reader correct and scrollable on mobile for free, and a
 * hand-rolled listbox would be a lot of code for a control most consumers keep
 * switched off.
 */
export function TimezoneSelect({
  value,
  onChange,
  options,
}: TimezoneSelectProps) {
  // Offsets are resolved once per option list rather than per render, since
  // each one costs an Intl format.
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
        {/* A value outside the offered list would otherwise silently reset the
            select to its first option. */}
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
