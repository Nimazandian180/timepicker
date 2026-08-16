import { describe, expect, it } from 'vitest';

import {
  addMinutes,
  clampDuration,
  clampTime,
  compareTime,
  durationFromMinutes,
  durationToMinutes,
  from12Hour,
  fromMinutes,
  isOnInterval,
  isSameTime,
  meridiemOf,
  normalizeTime,
  snapMinute,
  time,
  to12Hour,
  toMinutes,
  toSeconds,
  withMeridiem,
} from './time';

describe('normalizeTime', () => {
  it('carries minute overflow into the hour', () => {
    expect(normalizeTime(time(10, 75))).toEqual(time(11, 15));
  });

  it('carries second overflow into the minute', () => {
    expect(normalizeTime(time(10, 30, 90))).toEqual(time(10, 31, 30));
  });

  it('wraps past midnight', () => {
    expect(normalizeTime(time(25, 0))).toEqual(time(1, 0));
    expect(normalizeTime(time(23, 90))).toEqual(time(0, 30));
  });

  it('wraps backwards without going negative', () => {
    expect(normalizeTime(time(0, -30))).toEqual(time(23, 30));
    expect(normalizeTime(time(-1, 0))).toEqual(time(23, 0));
  });

  it('leaves a valid time untouched', () => {
    expect(normalizeTime(time(13, 45, 12))).toEqual(time(13, 45, 12));
  });
});

describe('minutes/seconds conversion', () => {
  it('round-trips through minutes', () => {
    expect(fromMinutes(toMinutes(time(17, 42)))).toEqual(time(17, 42));
  });

  it('counts from midnight', () => {
    expect(toMinutes(time(0, 0))).toBe(0);
    expect(toMinutes(time(23, 59))).toBe(1439);
    expect(toSeconds(time(23, 59, 59))).toBe(86399);
  });
});

describe('compareTime', () => {
  it('orders times within the day', () => {
    expect(compareTime(time(9, 0), time(17, 30))).toBe(-1);
    expect(compareTime(time(17, 30), time(9, 0))).toBe(1);
    expect(compareTime(time(9, 0), time(9, 0))).toBe(0);
  });

  it('ignores seconds when asked to', () => {
    expect(compareTime(time(9, 0, 45), time(9, 0, 0))).toBe(1);
    expect(compareTime(time(9, 0, 45), time(9, 0, 0), { seconds: false })).toBe(
      0,
    );
  });
});

describe('isSameTime', () => {
  it('treats two nulls as equal and one null as not', () => {
    expect(isSameTime(null, null)).toBe(true);
    expect(isSameTime(time(1, 0), null)).toBe(false);
  });
});

describe('clampTime', () => {
  it('pulls a value up to the minimum', () => {
    expect(clampTime(time(6, 0), time(9, 0), time(17, 0))).toEqual(time(9, 0));
  });

  it('pulls a value down to the maximum', () => {
    expect(clampTime(time(23, 0), time(9, 0), time(17, 0))).toEqual(
      time(17, 0),
    );
  });

  it('leaves an in-range value alone', () => {
    const value = time(12, 30);
    expect(clampTime(value, time(9, 0), time(17, 0))).toBe(value);
  });

  it('ignores absent bounds', () => {
    expect(clampTime(time(3, 0), null, undefined)).toEqual(time(3, 0));
  });
});

describe('addMinutes', () => {
  it('adds and subtracts across the hour', () => {
    expect(addMinutes(time(10, 55), 10)).toEqual(time(11, 5));
    expect(addMinutes(time(10, 5), -10)).toEqual(time(9, 55));
  });

  it('wraps at midnight in both directions', () => {
    expect(addMinutes(time(23, 55), 10)).toEqual(time(0, 5));
    expect(addMinutes(time(0, 5), -10)).toEqual(time(23, 55));
  });
});

describe('snapMinute', () => {
  it('rounds to the nearest multiple by default', () => {
    expect(snapMinute(time(10, 7), 15).minute).toBe(0);
    expect(snapMinute(time(10, 8), 15).minute).toBe(15);
  });

  it('rounds up and down on request', () => {
    expect(snapMinute(time(10, 1), 15, 'up').minute).toBe(15);
    expect(snapMinute(time(10, 14), 15, 'down').minute).toBe(0);
  });

  it('carries into the next hour when it snaps to 60', () => {
    expect(snapMinute(time(10, 58), 15)).toEqual(time(11, 0));
  });

  it('is a no-op for an interval of 1', () => {
    expect(snapMinute(time(10, 7), 1)).toEqual(time(10, 7));
  });

  it('clears seconds, which no interval grid can express', () => {
    expect(snapMinute(time(10, 30, 42), 5).second).toBe(0);
  });
});

describe('isOnInterval', () => {
  it('accepts anything at interval 1', () => {
    expect(isOnInterval(37, 1)).toBe(true);
  });

  it('checks the grid otherwise', () => {
    expect(isOnInterval(30, 15)).toBe(true);
    expect(isOnInterval(31, 15)).toBe(false);
  });
});

describe('12-hour conversion', () => {
  it('maps midnight and noon to 12', () => {
    expect(to12Hour(0)).toBe(12);
    expect(to12Hour(12)).toBe(12);
  });

  it('maps the afternoon down', () => {
    expect(to12Hour(13)).toBe(1);
    expect(to12Hour(23)).toBe(11);
  });

  it('round-trips every hour of the day', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const meridiem = hour < 12 ? 'am' : 'pm';
      expect(from12Hour(to12Hour(hour), meridiem)).toBe(hour);
    }
  });

  it('reports the meridiem', () => {
    expect(meridiemOf(time(11, 59))).toBe('am');
    expect(meridiemOf(time(12, 0))).toBe('pm');
  });
});

describe('withMeridiem', () => {
  it('moves a morning time to the afternoon and back', () => {
    expect(withMeridiem(time(9, 30), 'pm')).toEqual(time(21, 30));
    expect(withMeridiem(time(21, 30), 'am')).toEqual(time(9, 30));
  });

  it('is idempotent when the time is already in that half', () => {
    expect(withMeridiem(time(9, 30), 'am')).toEqual(time(9, 30));
  });

  it('handles the midnight/noon edge', () => {
    expect(withMeridiem(time(0, 15), 'pm')).toEqual(time(12, 15));
    expect(withMeridiem(time(12, 15), 'am')).toEqual(time(0, 15));
  });
});

describe('durations', () => {
  it('converts both ways', () => {
    expect(durationToMinutes({ hours: 1, minutes: 30 })).toBe(90);
    expect(durationFromMinutes(90)).toEqual({ hours: 1, minutes: 30 });
  });

  it('does not wrap at 24 hours, unlike a clock time', () => {
    expect(durationFromMinutes(30 * 60)).toEqual({ hours: 30, minutes: 0 });
  });

  it('never goes negative', () => {
    expect(durationFromMinutes(-10)).toEqual({ hours: 0, minutes: 0 });
  });

  it('clamps to the configured bounds', () => {
    expect(clampDuration({ hours: 0, minutes: 5 }, 30, 480)).toEqual({
      hours: 0,
      minutes: 30,
    });
    expect(clampDuration({ hours: 10, minutes: 0 }, 30, 480)).toEqual({
      hours: 8,
      minutes: 0,
    });
  });
});
