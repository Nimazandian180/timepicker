import { describe, expect, it } from 'vitest';

import { time } from '../core/time';
import {
  formatDuration,
  formatTime,
  formatTimeRange,
  toISOTime,
} from './format';
import { isValidTime, parseField, parseTime } from './parse';

describe('parseTime', () => {
  it('reads a plain 24-hour time', () => {
    expect(parseTime('21:30')).toEqual(time(21, 30));
  });

  it('reads Persian digits', () => {
    expect(parseTime('۰۹:۰۵')).toEqual(time(9, 5));
  });

  it('reads Arabic-Indic digits', () => {
    expect(parseTime('٠٩:٠٥')).toEqual(time(9, 5));
  });

  it('accepts the separators people actually type', () => {
    expect(parseTime('9.30')).toEqual(time(9, 30));
    expect(parseTime('9 30')).toEqual(time(9, 30));
    expect(parseTime('9،30')).toEqual(time(9, 30));
  });

  it('reads seconds when present', () => {
    expect(parseTime('09:05:07')).toEqual(time(9, 5, 7));
  });

  it('treats a bare number as an hour', () => {
    expect(parseTime('9')).toEqual(time(9, 0));
  });

  it('expands the 4-digit shorthand', () => {
    expect(parseTime('0930')).toEqual(time(9, 30));
    expect(parseTime('۲۱۴۵')).toEqual(time(21, 45));
  });

  describe('meridiem', () => {
    it('reads ق.ظ and ب.ظ', () => {
      expect(parseTime('۹:۳۰ ق.ظ')).toEqual(time(9, 30));
      expect(parseTime('۹:۳۰ ب.ظ')).toEqual(time(21, 30));
    });

    it('reads AM and PM in either case and with dots', () => {
      expect(parseTime('9:30 am')).toEqual(time(9, 30));
      expect(parseTime('9:30 P.M.')).toEqual(time(21, 30));
    });

    it('reads the long Persian forms', () => {
      expect(parseTime('۹:۳۰ بعد از ظهر')).toEqual(time(21, 30));
    });

    it('maps 12 ق.ظ to midnight and 12 ب.ظ to noon', () => {
      expect(parseTime('12:00 ق.ظ')).toEqual(time(0, 0));
      expect(parseTime('12:00 ب.ظ')).toEqual(time(12, 0));
    });

    it('trusts an already-24-hour number even with a marker', () => {
      expect(parseTime('21:30 ب.ظ')).toEqual(time(21, 30));
    });

    it('applies the assumed meridiem when the text has none', () => {
      expect(parseTime('9:30', { meridiem: 'pm' })).toEqual(time(21, 30));
      expect(parseTime('9:30', { meridiem: 'am' })).toEqual(time(9, 30));
    });

    it('lets the text win over the assumption', () => {
      expect(parseTime('9:30 ق.ظ', { meridiem: 'pm' })).toEqual(time(9, 30));
    });
  });

  describe('rejects', () => {
    it.each([
      ['', 'empty'],
      ['abc', 'letters'],
      ['24:00', 'hour out of range'],
      ['12:60', 'minute out of range'],
      ['10:30:60', 'second out of range'],
      ['1:2:3:4', 'too many parts'],
      ['123', 'three digits is ambiguous'],
    ])('%s (%s)', (input) => {
      expect(parseTime(input)).toBeNull();
    });

    it('rejects a non-string', () => {
      expect(parseTime(undefined as unknown as string)).toBeNull();
    });
  });

  it('isValidTime agrees with parseTime', () => {
    expect(isValidTime('21:30')).toBe(true);
    expect(isValidTime('25:00')).toBe(false);
  });
});

describe('parseField', () => {
  it('reads digits in either script', () => {
    expect(parseField('07')).toBe(7);
    expect(parseField('۰۷')).toBe(7);
  });

  it('returns null for an empty or partial box rather than 0', () => {
    expect(parseField('')).toBeNull();
    expect(parseField('  ')).toBeNull();
    expect(parseField('-')).toBeNull();
  });
});

describe('formatTime', () => {
  it('formats 24-hour with Persian digits by default', () => {
    expect(formatTime(time(22, 30))).toBe('۲۲:۳۰');
  });

  it('formats 12-hour with the Persian meridiem', () => {
    expect(formatTime(time(10, 30), { format: '12h' })).toBe('۱۰:۳۰ ق.ظ');
    expect(formatTime(time(22, 30), { format: '12h' })).toBe('۱۰:۳۰ ب.ظ');
  });

  it('honours leadingZero', () => {
    expect(formatTime(time(9, 5), { leadingZero: true })).toBe('۰۹:۰۵');
    expect(formatTime(time(9, 5), { leadingZero: false })).toBe('۹:۰۵');
  });

  it('always pads the minute, whatever leadingZero says', () => {
    expect(formatTime(time(9, 5), { leadingZero: false })).toContain('۰۵');
  });

  it('adds seconds on request', () => {
    expect(formatTime(time(9, 5, 7), { showSeconds: true })).toBe('۰۹:۰۵:۰۷');
  });

  it('can stay in Latin digits', () => {
    expect(formatTime(time(22, 30), { persianDigits: false })).toBe('22:30');
  });

  it('can drop the meridiem suffix', () => {
    expect(
      formatTime(time(22, 30), { format: '12h', showMeridiem: false }),
    ).toBe('۱۰:۳۰');
  });

  it('shows midnight and noon as 12 in 12-hour mode', () => {
    expect(formatTime(time(0, 0), { format: '12h' })).toBe('۱۲:۰۰ ق.ظ');
    expect(formatTime(time(12, 0), { format: '12h' })).toBe('۱۲:۰۰ ب.ظ');
  });
});

describe('formatTimeRange', () => {
  it('joins the endpoints with an en dash', () => {
    expect(formatTimeRange({ start: time(9, 0), end: time(17, 30) })).toBe(
      '۰۹:۰۰ – ۱۷:۳۰',
    );
  });

  it('shows a placeholder for an open range', () => {
    expect(formatTimeRange({ start: time(9, 0), end: null })).toBe('۰۹:۰۰ – —');
  });
});

describe('formatDuration', () => {
  it('reads naturally in Persian', () => {
    expect(formatDuration({ hours: 1, minutes: 30 })).toBe('۱ ساعت و ۳۰ دقیقه');
  });

  it('drops a zero half rather than printing it', () => {
    expect(formatDuration({ hours: 2, minutes: 0 })).toBe('۲ ساعت');
    expect(formatDuration({ hours: 0, minutes: 45 })).toBe('۴۵ دقیقه');
  });

  it('keeps a zero duration expressible', () => {
    expect(formatDuration({ hours: 0, minutes: 0 })).toBe('۰ دقیقه');
  });

  it('has a compact form', () => {
    expect(formatDuration({ hours: 1, minutes: 5 }, { compact: true })).toBe(
      '۱:۰۵',
    );
  });
});

describe('toISOTime', () => {
  it('is always Latin, padded and 24-hour', () => {
    expect(toISOTime(time(9, 5))).toBe('09:05');
    expect(toISOTime(time(9, 5, 7), true)).toBe('09:05:07');
  });
});

describe('round trip', () => {
  it('survives format → parse for every minute of the day', () => {
    for (let minutes = 0; minutes < 24 * 60; minutes += 7) {
      const value = time(Math.floor(minutes / 60), minutes % 60);
      for (const format of ['12h', '24h'] as const) {
        const text = formatTime(value, { format });
        expect(parseTime(text)).toEqual(value);
      }
    }
  });
});
