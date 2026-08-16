'use client';

import { VIEW_LABELS } from '../core/constants';
import { cn } from '../utils/cn';
import styles from './JalaliTimePicker.module.css';

export interface ViewSwitchProps {
  view: 'analog' | 'digital';
  onChange: (view: 'analog' | 'digital') => void;
}

/** The عقربه‌ای / عددی toggle, shown only in hybrid mode. */
export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div className={styles.viewSwitch} role="tablist" aria-label="نوع نمایش">
      {(['analog', 'digital'] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={view === option}
          className={cn(
            styles.viewButton,
            view === option && styles.viewButtonActive,
          )}
          onClick={() => onChange(option)}
        >
          {VIEW_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
