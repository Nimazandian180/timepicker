'use client';

import { ACTION_LABELS } from '../core/constants';
import { cn } from '../utils/cn';
import styles from './JalaliTimePicker.module.css';

export interface TimeFooterProps {
  showNow?: boolean;
  showClear?: boolean;
  showCancel?: boolean;
  showDone?: boolean;
  /** False while the draft breaks a constraint — تأیید must not commit it. */
  canConfirm?: boolean;
  onNow: () => void;
  onClear: () => void;
  onCancel: () => void;
  onDone: () => void;
}

export function TimeFooter({
  showNow = true,
  showClear = false,
  showCancel = true,
  showDone = true,
  canConfirm = true,
  onNow,
  onClear,
  onCancel,
  onDone,
}: TimeFooterProps) {
  return (
    <div className={styles.footer}>
      {/* Under dir="rtl": اکنون/پاک کردن sit on the right; لغو + تأیید group on
          the left (لغو precedes تأیید in the DOM, so تأیید lands furthest left).
          Same arrangement as the date picker's footer, so a card holding both
          reads as one control rather than two. */}
      {showNow && (
        <button
          type="button"
          className={cn(styles.button, styles.buttonGhost)}
          onClick={onNow}
        >
          {ACTION_LABELS.now}
        </button>
      )}
      {showClear && (
        <button
          type="button"
          className={cn(styles.button, styles.buttonGhost)}
          onClick={onClear}
        >
          {ACTION_LABELS.clear}
        </button>
      )}
      <span className={styles.footerGrow} />
      {showCancel && (
        <button
          type="button"
          className={cn(styles.button, styles.buttonGhost)}
          onClick={onCancel}
        >
          {ACTION_LABELS.cancel}
        </button>
      )}
      {showDone && (
        <button
          type="button"
          className={cn(styles.button, styles.buttonPrimary)}
          disabled={!canConfirm}
          onClick={onDone}
        >
          {ACTION_LABELS.done}
        </button>
      )}
    </div>
  );
}
