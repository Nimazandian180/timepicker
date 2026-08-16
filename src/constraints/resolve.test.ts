import { describe, expect, it, vi } from 'vitest';

import { time } from '../core/time';
import {
  isHourDisabled,
  isMinuteDisabled,
  isTimeAllowed,
  nearestAllowedTime,
  resolveTime,
} from './resolve';
import type { TimeConstraints } from './types';

/** Business hours, the constraint everybody actually writes. */
const OFFICE: TimeConstraints = {
  minTime: time(9, 0),
  maxTime: time(17, 0),
};

describe('resolveTime', () => {
  it('allows anything with no constraints', () => {
    expect(resolveTime(time(3, 17))).toEqual({ isAllowed: true, reason: null });
  });

  it('reports which bound rejected it', () => {
    expect(resolveTime(time(8, 0), OFFICE).reason).toBe('before-min');
    expect(resolveTime(time(18, 0), OFFICE).reason).toBe('after-max');
  });

  it('treats both bounds as inclusive', () => {
    expect(isTimeAllowed(time(9, 0), OFFICE)).toBe(true);
    expect(isTimeAllowed(time(17, 0), OFFICE)).toBe(true);
  });

  it('ignores seconds against a bound unless showing them', () => {
    // 17:00:30 is "17:00" to a user who cannot see seconds.
    expect(isTimeAllowed(time(17, 0, 30), OFFICE)).toBe(true);
    expect(isTimeAllowed(time(17, 0, 30), OFFICE, { seconds: true })).toBe(
      false,
    );
  });

  it('rejects a disabled hour', () => {
    const constraints = { disabledHours: [13] };
    expect(resolveTime(time(13, 0), constraints).reason).toBe('disabled-hour');
    expect(isTimeAllowed(time(14, 0), constraints)).toBe(true);
  });

  it('rejects a disabled minute in every hour', () => {
    const constraints = { disabledMinutes: [15] };
    expect(isTimeAllowed(time(9, 15), constraints)).toBe(false);
    expect(isTimeAllowed(time(14, 15), constraints)).toBe(false);
    expect(isTimeAllowed(time(14, 16), constraints)).toBe(true);
  });

  it('rejects a disabled minute range, inclusive at both ends', () => {
    const constraints = { disabledMinuteRanges: [{ from: 30, to: 45 }] };
    expect(isTimeAllowed(time(9, 29), constraints)).toBe(true);
    expect(isTimeAllowed(time(9, 30), constraints)).toBe(false);
    expect(isTimeAllowed(time(9, 45), constraints)).toBe(false);
    expect(isTimeAllowed(time(9, 46), constraints)).toBe(true);
  });

  it('rejects a specific booked time', () => {
    const constraints = { disabledTimes: [time(10, 30)] };
    expect(resolveTime(time(10, 30), constraints).reason).toBe('disabled-time');
    expect(isTimeAllowed(time(10, 31), constraints)).toBe(true);
  });

  it('rejects a time off the interval grid', () => {
    expect(resolveTime(time(10, 7), {}, { interval: 15 }).reason).toBe(
      'off-interval',
    );
    expect(isTimeAllowed(time(10, 15), {}, { interval: 15 })).toBe(true);
  });

  it('runs the predicate last, and only when everything else passed', () => {
    const disabledTime = vi.fn(() => false);
    isTimeAllowed(time(8, 0), { ...OFFICE, disabledTime });
    expect(disabledTime).not.toHaveBeenCalled();

    isTimeAllowed(time(10, 0), { ...OFFICE, disabledTime });
    expect(disabledTime).toHaveBeenCalledWith(time(10, 0));
  });

  it('honours the predicate’s verdict', () => {
    const constraints = {
      disabledTime: (value: { hour: number }) => value.hour % 2 === 1,
    };
    expect(isTimeAllowed(time(10, 0), constraints)).toBe(true);
    expect(isTimeAllowed(time(11, 0), constraints)).toBe(false);
  });
});

describe('isHourDisabled', () => {
  it('greys out an hour listed in disabledHours', () => {
    expect(isHourDisabled(13, { disabledHours: [13] })).toBe(true);
  });

  it('greys out an hour entirely outside the bounds', () => {
    expect(isHourDisabled(3, OFFICE)).toBe(true);
    expect(isHourDisabled(20, OFFICE)).toBe(true);
  });

  it('keeps a partially available hour selectable', () => {
    // 09:00 is the minimum, so hour 9 has usable minutes even though 09:00 is
    // the only one below it — greying it out would make the bound unreachable.
    expect(isHourDisabled(9, OFFICE)).toBe(false);
    expect(isHourDisabled(17, OFFICE)).toBe(false);
  });

  it('does not grey out an hour merely because one minute is booked', () => {
    expect(isHourDisabled(10, { disabledTimes: [time(10, 30)] })).toBe(false);
  });

  it('greys out an hour whose every reachable slot is booked at a coarse interval', () => {
    const constraints = {
      disabledTimes: [time(10, 0), time(10, 30)],
    };
    expect(isHourDisabled(10, constraints, { interval: 30 })).toBe(true);
    // At a 1-minute interval 10:01 is still free, so the hour lives.
    expect(isHourDisabled(10, constraints, { interval: 1 })).toBe(false);
  });
});

describe('isMinuteDisabled', () => {
  it('checks the minute inside its hour', () => {
    expect(isMinuteDisabled(8, 30, OFFICE)).toBe(true);
    expect(isMinuteDisabled(10, 30, OFFICE)).toBe(false);
  });

  it('respects a partially bounded hour', () => {
    expect(isMinuteDisabled(17, 0, OFFICE)).toBe(false);
    expect(isMinuteDisabled(17, 1, OFFICE)).toBe(true);
  });
});

describe('nearestAllowedTime', () => {
  it('returns the value untouched when it is already allowed', () => {
    const value = time(10, 0);
    expect(nearestAllowedTime(value, OFFICE)).toBe(value);
  });

  it('walks up to the minimum', () => {
    expect(nearestAllowedTime(time(7, 0), OFFICE)).toEqual(time(9, 0));
  });

  it('walks down to the maximum', () => {
    expect(nearestAllowedTime(time(19, 0), OFFICE)).toEqual(time(17, 0));
  });

  it('finds the closest free slot around a booked one', () => {
    const constraints = { disabledTimes: [time(10, 30)] };
    const result = nearestAllowedTime(time(10, 30), constraints, {
      interval: 30,
    });
    // Both 10:00 and 11:00 are one step away; the search prefers forward.
    expect(result).toEqual(time(11, 0));
  });

  it('snaps onto the interval grid', () => {
    // 10:07 is 7 minutes past 10:00 and 8 short of 10:15, so 10:00 wins.
    expect(nearestAllowedTime(time(10, 7), {}, { interval: 15 })).toEqual(
      time(10, 0),
    );
    expect(nearestAllowedTime(time(10, 9), {}, { interval: 15 })).toEqual(
      time(10, 15),
    );
  });

  it('breaks a distance tie by going forward', () => {
    // Both 10:00 and 10:30 are 15 minutes away from 10:15.
    expect(nearestAllowedTime(time(10, 15), {}, { interval: 30 })).toEqual(
      time(10, 30),
    );
  });

  it('gives up rather than spinning when nothing is selectable', () => {
    expect(nearestAllowedTime(time(10, 0), { disabledTime: () => true })).toBe(
      null,
    );
  });
});
