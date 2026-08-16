// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { time } from '../core/time';
import { JalaliTimePicker } from './JalaliTimePicker';

// Real state updates run here (picking an hour advances the stage), so React
// has to be told this is an act() environment.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** A fixed clock, so nothing in these tests depends on when they run. */
const NOW = time(14, 25, 40);

let container: HTMLElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

function render(ui: React.ReactElement): HTMLElement {
  container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

function click(el: Element | null | undefined) {
  act(() => {
    (el as HTMLElement).click();
  });
}

/** Every clock tick, in DOM order. */
const ticks = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')].filter((el) =>
    el.className.includes('tick'),
  );

/** The tick showing a given label. */
const tick = (host: HTMLElement, label: string) =>
  ticks(host).find((el) => el.textContent === label);

const button = (host: HTMLElement, text: string) =>
  [...host.querySelectorAll('button')].find((el) => el.textContent === text);

/** The spoken form of the current reading, from the live region. */
const reading = (host: HTMLElement) =>
  host.querySelector('[aria-live="polite"]')?.textContent ?? '';

const input = (host: HTMLElement, label: string) =>
  host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);

describe('rendering', () => {
  it('renders on the server without touching the DOM', () => {
    const html = renderToStaticMarkup(<JalaliTimePicker now={NOW} />);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('۱۴');
  });

  it('opens on the injected now, not the ambient clock', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    expect(reading(host)).toBe('۱۴:۲۵');
  });

  it('opens on the value when given one', () => {
    const host = render(
      <JalaliTimePicker now={NOW} defaultValue={time(9, 5)} />,
    );
    expect(reading(host)).toBe('۰۹:۰۵');
  });

  it('draws 24 ticks in 24-hour mode and 12 in 12-hour mode', () => {
    const host24 = render(<JalaliTimePicker now={NOW} format="24h" />);
    expect(ticks(host24)).toHaveLength(24);
    container?.remove();

    const host12 = render(<JalaliTimePicker now={NOW} format="12h" />);
    expect(ticks(host12)).toHaveLength(12);
  });

  it('shows the meridiem pills only in 12-hour mode', () => {
    const host = render(<JalaliTimePicker now={NOW} format="12h" />);
    expect(button(host, 'ق.ظ')).toBeDefined();
    expect(button(host, 'ب.ظ')).toBeDefined();
  });
});

describe('the default flow', () => {
  it('advances hour → minute after picking an hour', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    // Hour stage: ticks are labelled 1–12 plus the inner 13–24 ring.
    click(tick(host, '۹'));
    expect(reading(host)).toBe('۰۹:۲۵');
    // Now on the minute stage, where the ticks are ۰۰, ۵, ۱۰ …
    expect(tick(host, '۳۰')).toBeDefined();
    click(tick(host, '۳۰'));
    expect(reading(host)).toBe('۰۹:۳۰');
  });

  it('advances minute → second only when seconds are shown', () => {
    const host = render(<JalaliTimePicker now={NOW} showSeconds />);
    click(tick(host, '۹'));
    click(tick(host, '۳۰'));
    // Second stage now; picking here changes the seconds, not the minutes.
    click(tick(host, '۱۵'));
    expect(reading(host)).toBe('۰۹:۳۰:۱۵');
  });

  it('picks from the inner 13–24 ring', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    click(tick(host, '۲۱'));
    expect(reading(host)).toBe('۲۱:۲۵');
  });

  it('maps the inner ۰۰ tick to midnight', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    click(tick(host, '۰۰'));
    expect(reading(host)).toBe('۰۰:۲۵');
  });

  it('lets the display send you back to the hour stage', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    click(tick(host, '۹'));
    // Back to hours via the big reading, then pick a different one.
    const hourUnit = host.querySelector('[aria-pressed]');
    click(hourUnit);
    click(tick(host, '۱۱'));
    expect(reading(host)).toBe('۱۱:۲۵');
  });
});

describe('12-hour mode', () => {
  it('keeps the stored time when the meridiem changes', () => {
    const host = render(
      <JalaliTimePicker now={NOW} format="12h" defaultValue={time(9, 30)} />,
    );
    expect(reading(host)).toBe('۰۹:۳۰ ق.ظ');
    click(button(host, 'ب.ظ'));
    expect(reading(host)).toBe('۰۹:۳۰ ب.ظ');
  });

  it('picks the hour into the current half of the day', () => {
    const host = render(
      <JalaliTimePicker now={NOW} format="12h" defaultValue={time(9, 0)} />,
    );
    click(button(host, 'ب.ظ'));
    click(tick(host, '۳'));
    // 3 ب.ظ is 15:00 — confirmed through the emitted value, not the label.
    const onConfirm = vi.fn();
    expect(reading(host)).toBe('۰۳:۰۰ ب.ظ');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('emits a 24-hour value regardless of display format', () => {
    const onConfirm = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        format="12h"
        defaultValue={time(9, 0)}
        onConfirm={onConfirm}
      />,
    );
    click(button(host, 'ب.ظ'));
    click(button(host, 'تأیید'));
    expect(onConfirm).toHaveBeenCalledWith(time(21, 0));
  });
});

describe('minute intervals', () => {
  it('draws the minute ring on the interval, not every 5', () => {
    const host = render(<JalaliTimePicker now={NOW} minuteInterval={15} />);
    click(tick(host, '۹'));
    expect(ticks(host).map((el) => el.textContent)).toEqual([
      '۰۰',
      '۱۵',
      '۳۰',
      '۴۵',
    ]);
  });

  it('selects a minute off the interval ring', () => {
    const host = render(<JalaliTimePicker now={NOW} minuteInterval={15} />);
    click(tick(host, '۹'));
    click(tick(host, '۱۵'));
    expect(reading(host)).toBe('۰۹:۱۵');
  });

  it('keeps the 5-step ring for an interval that does not divide the hour', () => {
    const host = render(<JalaliTimePicker now={NOW} minuteInterval={7} />);
    click(tick(host, '۹'));
    expect(ticks(host)).toHaveLength(12);
    // …and the ones that are unreachable at that interval are disabled.
    expect(tick(host, '۵')?.disabled).toBe(true);
  });

  it('steps the digital field by a whole interval', () => {
    const host = render(
      <JalaliTimePicker
        now={NOW}
        mode="digital"
        minuteInterval={15}
        defaultValue={time(9, 0)}
      />,
    );
    click(host.querySelector('[aria-label="افزایش دقیقه"]'));
    expect(reading(host)).toBe('۰۹:۱۵');
  });
});

describe('digital input', () => {
  it('commits typed text on blur', () => {
    const host = render(
      <JalaliTimePicker now={NOW} mode="digital" defaultValue={time(9, 0)} />,
    );
    const hour = input(host, 'ساعت')!;
    act(() => {
      hour.focus();
      // Simulate typing via the React-controlled value.
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(hour, '17');
      hour.dispatchEvent(new Event('input', { bubbles: true }));
      hour.blur();
    });
    expect(reading(host)).toBe('۱۷:۰۰');
  });

  it('clamps out-of-range input rather than rejecting it', () => {
    const host = render(
      <JalaliTimePicker now={NOW} mode="digital" defaultValue={time(9, 0)} />,
    );
    const minute = input(host, 'دقیقه')!;
    act(() => {
      // Focus first: React listens on focusout, so blur() on an unfocused
      // element would never reach onBlur and the commit would never run.
      minute.focus();
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(minute, '90');
      minute.dispatchEvent(new Event('input', { bubbles: true }));
      minute.blur();
    });
    expect(reading(host)).toBe('۰۹:۵۹');
  });

  it('shows the seconds box only when asked', () => {
    const host = render(<JalaliTimePicker now={NOW} mode="digital" />);
    expect(input(host, 'ثانیه')).toBeNull();
    container?.remove();

    const withSeconds = render(
      <JalaliTimePicker now={NOW} mode="digital" showSeconds />,
    );
    expect(input(withSeconds, 'ثانیه')).not.toBeNull();
  });
});

describe('constraints', () => {
  it('greys out hours entirely outside the bounds', () => {
    const host = render(
      <JalaliTimePicker now={NOW} minTime={time(9, 0)} maxTime={time(17, 0)} />,
    );
    expect(tick(host, '۳')?.disabled).toBe(true);
    expect(tick(host, '۱۰')?.disabled).toBe(false);
  });

  it('keeps a partially available hour selectable', () => {
    const host = render(
      <JalaliTimePicker
        now={NOW}
        minTime={time(9, 30)}
        maxTime={time(17, 0)}
      />,
    );
    expect(tick(host, '۹')?.disabled).toBe(false);
  });

  it('shows an error and blocks تأیید for an out-of-range draft', () => {
    const onConfirm = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        defaultValue={time(3, 0)}
        minTime={time(9, 0)}
        maxTime={time(17, 0)}
        onConfirm={onConfirm}
      />,
    );
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'خارج از بازهٔ مجاز',
    );
    const done = button(host, 'تأیید') as HTMLButtonElement;
    expect(done.disabled).toBe(true);
    click(done);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('can hide the error message', () => {
    const host = render(
      <JalaliTimePicker
        now={NOW}
        defaultValue={time(3, 0)}
        minTime={time(9, 0)}
        showError={false}
      />,
    );
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });
});

describe('actions', () => {
  it('اکنون jumps to the injected now', () => {
    const host = render(
      <JalaliTimePicker now={NOW} defaultValue={time(1, 0)} />,
    );
    click(button(host, 'اکنون'));
    expect(reading(host)).toBe('۱۴:۲۵');
  });

  it('اکنون lands on the nearest allowed time when now is out of range', () => {
    const host = render(
      <JalaliTimePicker
        now={time(20, 0)}
        minTime={time(9, 0)}
        maxTime={time(17, 0)}
      />,
    );
    click(button(host, 'اکنون'));
    expect(reading(host)).toBe('۱۷:۰۰');
  });

  it('تأیید commits the staged draft', () => {
    const onConfirm = vi.fn();
    const host = render(<JalaliTimePicker now={NOW} onConfirm={onConfirm} />);
    click(tick(host, '۹'));
    click(button(host, 'تأیید'));
    expect(onConfirm).toHaveBeenCalledWith(time(9, 25, 40));
  });

  it('لغو reverts the draft and reports', () => {
    const onCancel = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        defaultValue={time(9, 0)}
        onCancel={onCancel}
      />,
    );
    click(tick(host, '۱۱'));
    expect(reading(host)).toBe('۱۱:۰۰');
    click(button(host, 'لغو'));
    expect(onCancel).toHaveBeenCalled();
    expect(reading(host)).toBe('۰۹:۰۰');
  });

  it('does not commit until تأیید in confirm mode', () => {
    const onChange = vi.fn();
    const host = render(<JalaliTimePicker now={NOW} onChange={onChange} />);
    click(tick(host, '۹'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits every change in instant mode', () => {
    const onChange = vi.fn();
    const host = render(
      <JalaliTimePicker now={NOW} commitMode="instant" onChange={onChange} />,
    );
    click(tick(host, '۹'));
    expect(onChange).toHaveBeenCalledWith(time(9, 25, 40));
  });

  it('hides each action on request', () => {
    const host = render(
      <JalaliTimePicker
        now={NOW}
        showNow={false}
        showCancel={false}
        showClear
      />,
    );
    expect(button(host, 'اکنون')).toBeUndefined();
    expect(button(host, 'لغو')).toBeUndefined();
    expect(button(host, 'پاک کردن')).toBeDefined();
  });

  it('drops the whole footer on request', () => {
    const host = render(<JalaliTimePicker now={NOW} showFooter={false} />);
    expect(button(host, 'تأیید')).toBeUndefined();
  });

  it('پاک کردن clears the selection and reports', () => {
    const onClear = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        showClear
        defaultValue={time(9, 0)}
        onClear={onClear}
      />,
    );
    click(button(host, 'پاک کردن'));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('range mode', () => {
  it('shows both endpoints and edits the active one', () => {
    const host = render(
      <JalaliTimePicker
        now={NOW}
        selectionMode="range"
        defaultValue={{ start: time(9, 0), end: time(17, 0) }}
      />,
    );
    // Start is active by default.
    click(tick(host, '۱۰'));
    expect(reading(host)).toBe('۱۰:۰۰');

    // Switch to the end endpoint via its tab.
    const tabs = host.querySelectorAll('[role="tab"]');
    click(tabs[1]);
    expect(reading(host)).toBe('۱۷:۰۰');
  });

  it('refuses to let the end fall before the start', () => {
    const onConfirm = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        selectionMode="range"
        defaultValue={{ start: time(9, 0), end: time(17, 0) }}
        onConfirm={onConfirm}
      />,
    );
    const tabs = host.querySelectorAll('[role="tab"]');
    click(tabs[1]);
    // 3 is before the 9:00 start, so it is pinned to the start instead.
    click(tick(host, '۳'));
    click(button(host, 'تأیید'));
    expect(onConfirm).toHaveBeenCalledWith({
      start: time(9, 0),
      end: time(9, 0),
    });
  });

  it('allows an overnight span when sameDay is off', () => {
    const onConfirm = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        selectionMode="range"
        sameDay={false}
        defaultValue={{ start: time(22, 0), end: time(23, 0) }}
        onConfirm={onConfirm}
      />,
    );
    const tabs = host.querySelectorAll('[role="tab"]');
    click(tabs[1]);
    click(tick(host, '۶'));
    click(button(host, 'تأیید'));
    expect(onConfirm).toHaveBeenCalledWith({
      start: time(22, 0),
      end: time(6, 0),
    });
  });
});

describe('duration mode', () => {
  it('reads as a duration, not a clock time', () => {
    const host = render(
      <JalaliTimePicker
        now={NOW}
        selectionMode="duration"
        defaultValue={{ hours: 1, minutes: 30 }}
      />,
    );
    expect(reading(host)).toBe('۱ ساعت و ۳۰ دقیقه');
  });

  it('has no meridiem, whatever the format', () => {
    const host = render(
      <JalaliTimePicker
        now={NOW}
        selectionMode="duration"
        format="12h"
        defaultValue={{ hours: 1, minutes: 0 }}
      />,
    );
    expect(button(host, 'ق.ظ')).toBeUndefined();
  });

  it('clamps to the configured bounds', () => {
    const onConfirm = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        selectionMode="duration"
        defaultValue={{ hours: 1, minutes: 0 }}
        maxDuration={120}
        onConfirm={onConfirm}
      />,
    );
    click(tick(host, '۵'));
    click(button(host, 'تأیید'));
    expect(onConfirm).toHaveBeenCalledWith({ hours: 2, minutes: 0 });
  });
});

describe('modes', () => {
  it('hybrid offers the switch, the others do not', () => {
    const hybrid = render(<JalaliTimePicker now={NOW} />);
    expect(hybrid.querySelector('[role="tablist"]')).not.toBeNull();
    container?.remove();

    const analog = render(<JalaliTimePicker now={NOW} mode="analog" />);
    expect(analog.querySelector('[role="tablist"]')).toBeNull();
  });

  it('switches between the clock and the fields', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    expect(ticks(host).length).toBeGreaterThan(0);
    click(button(host, 'عددی'));
    expect(ticks(host)).toHaveLength(0);
    expect(input(host, 'ساعت')).not.toBeNull();
  });
});

describe('accessibility', () => {
  it('labels the clock as a radiogroup for the current stage', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    const face = host.querySelector('[role="radiogroup"]')!;
    expect(face.getAttribute('aria-label')).toBe('انتخاب ساعت');
    click(tick(host, '۹'));
    expect(
      host.querySelector('[role="radiogroup"]')!.getAttribute('aria-label'),
    ).toBe('انتخاب دقیقه');
  });

  it('marks the selected tick with aria-checked, not colour alone', () => {
    const host = render(
      <JalaliTimePicker now={NOW} defaultValue={time(9, 0)} />,
    );
    expect(tick(host, '۹')?.getAttribute('aria-checked')).toBe('true');
    expect(tick(host, '۱۰')?.getAttribute('aria-checked')).toBe('false');
  });

  it('keeps the ticks out of the tab order, with the face as the tab stop', () => {
    const host = render(<JalaliTimePicker now={NOW} />);
    const face = host.querySelector('[role="radiogroup"]')!;
    expect(face.getAttribute('tabindex')).toBe('0');
    expect(ticks(host).every((el) => el.tabIndex === -1)).toBe(true);
  });

  it('steps the value with the arrow keys', () => {
    const host = render(
      <JalaliTimePicker now={NOW} defaultValue={time(9, 0)} />,
    );
    const face = host.querySelector('[role="radiogroup"]')!;
    act(() => {
      face.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    });
    expect(reading(host)).toBe('۱۰:۰۰');
    act(() => {
      face.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
    });
    expect(reading(host)).toBe('۰۹:۰۰');
  });

  it('advances the stage on Enter', () => {
    const host = render(
      <JalaliTimePicker now={NOW} defaultValue={time(9, 0)} />,
    );
    const face = host.querySelector('[role="radiogroup"]')!;
    act(() => {
      face.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    expect(
      host.querySelector('[role="radiogroup"]')!.getAttribute('aria-label'),
    ).toBe('انتخاب دقیقه');
  });

  it('cancels on Escape', () => {
    const onCancel = vi.fn();
    const host = render(
      <JalaliTimePicker
        now={NOW}
        defaultValue={time(9, 0)}
        onCancel={onCancel}
      />,
    );
    act(() => {
      host.firstElementChild!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(onCancel).toHaveBeenCalled();
  });
});
