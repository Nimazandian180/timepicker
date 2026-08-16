// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { time } from '../core/time';
import { timePlugin } from './index';
import type {
  AnyDatePickerPlugin,
  DatePickerPluginContext,
  JalaliDateLike,
} from './types';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const DATE: JalaliDateLike = { year: 1404, month: 5, day: 17 };

/**
 * A stand-in for `JalaliDatePicker`, implementing exactly the contract in
 * `./types`.
 *
 * The real date picker is an *optional* peer dependency, so it cannot be
 * required for the suite to run. This host is the next best thing and arguably
 * a better test: it exercises the contract itself rather than one
 * implementation of it, so a change on either side that breaks the agreement
 * shows up here.
 */
function FakeDatePicker<TExtra extends object>({
  plugins,
  onConfirm,
  onChange,
  mode = 'confirm',
}: {
  plugins: readonly AnyDatePickerPlugin<TExtra>[];
  onConfirm?: (value: (JalaliDateLike & TExtra) | null) => void;
  onChange?: (value: JalaliDateLike & TExtra) => void;
  mode?: 'instant' | 'confirm';
}) {
  const [store, setStore] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      plugins.map((plugin) => [
        plugin.name,
        typeof plugin.initialState === 'function'
          ? (plugin.initialState as () => unknown)()
          : plugin.initialState,
      ]),
    ),
  );
  const [selection, setSelection] = useState<JalaliDateLike | null>(null);

  const extend = (value: JalaliDateLike | null) => {
    if (!value) return null;
    let out: object = value;
    for (const plugin of plugins) {
      if (!plugin.extendValue) continue;
      out = {
        ...out,
        ...plugin.extendValue(value, store[plugin.name]),
      };
    }
    return out as JalaliDateLike & TExtra;
  };

  const confirm = () => onConfirm?.(extend(selection));

  return (
    <div>
      <button
        type="button"
        data-testid="pick-day"
        onClick={() => {
          setSelection(DATE);
          if (mode === 'instant') {
            const extended = extend(DATE);
            if (extended) onChange?.(extended);
          }
        }}
      >
        pick
      </button>
      <button type="button" data-testid="host-confirm" onClick={confirm}>
        confirm
      </button>
      {plugins.map((plugin) => {
        const ctx: DatePickerPluginContext<unknown> = {
          state: store[plugin.name],
          setState: (next) =>
            setStore((current) => ({
              ...current,
              [plugin.name]:
                typeof next === 'function'
                  ? (next as (state: unknown) => unknown)(current[plugin.name])
                  : next,
            })),
          selection,
          selectionMode: 'single',
          view: 'day',
          today: DATE,
          mode,
          isEmpty: selection === null,
          confirm,
          cancel: () => setSelection(null),
        };
        return <div key={plugin.name}>{plugin.render?.(ctx)}</div>;
      })}
    </div>
  );
}

let container: HTMLElement;

function render(ui: React.ReactElement): HTMLElement {
  container = document.createElement('div');
  document.body.append(container);
  act(() => createRoot(container).render(ui));
  return container;
}

const click = (el: Element | null | undefined) =>
  act(() => {
    (el as HTMLElement).click();
  });

const tick = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
    (el) => el.textContent === label,
  );

describe('timePlugin()', () => {
  it('returns a plugin with the shape the contract requires', () => {
    const plugin = timePlugin();
    expect(plugin.name).toBe('time');
    expect(plugin.slot).toBe('panel');
    expect(typeof plugin.render).toBe('function');
    expect(typeof plugin.extendValue).toBe('function');
  });

  it('starts at midnight unless told otherwise', () => {
    expect(timePlugin().initialState).toEqual(time(0, 0, 0));
    expect(timePlugin({ defaultValue: time(9, 30) }).initialState).toEqual(
      time(9, 30),
    );
  });

  it('takes a custom name and slot, so two clocks can coexist', () => {
    const plugin = timePlugin({ name: 'end-time', slot: 'footer' });
    expect(plugin.name).toBe('end-time');
    expect(plugin.slot).toBe('footer');
  });

  it('merges the time into the date', () => {
    const plugin = timePlugin();
    expect(plugin.extendValue?.(DATE, time(22, 30, 15))).toEqual({
      hour: 22,
      minute: 30,
      second: 15,
    });
  });
});

describe('inside a host', () => {
  it('renders the clock into the host', () => {
    const host = render(<FakeDatePicker plugins={[timePlugin()]} />);
    expect(host.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it('drops its own card chrome and footer when embedded', () => {
    const host = render(<FakeDatePicker plugins={[timePlugin()]} />);
    // The host owns the footer; a second تأیید would be ambiguous.
    const labels = [...host.querySelectorAll('button')].map(
      (el) => el.textContent,
    );
    expect(labels).not.toContain('تأیید');
    expect(host.querySelector('.jtp-embedded')).not.toBeNull();
  });

  it('hands the host a combined date and time on confirm', () => {
    const onConfirm = vi.fn();
    const host = render(
      <FakeDatePicker
        plugins={[timePlugin({ defaultValue: time(9, 0) })]}
        onConfirm={onConfirm}
      />,
    );
    click(host.querySelector('[data-testid="pick-day"]'));
    click(host.querySelector('[data-testid="host-confirm"]'));
    expect(onConfirm).toHaveBeenCalledWith({
      ...DATE,
      hour: 9,
      minute: 0,
      second: 0,
    });
  });

  it('reflects a time picked in the clock', () => {
    const onConfirm = vi.fn();
    const host = render(
      <FakeDatePicker
        plugins={[timePlugin({ defaultValue: time(9, 0) })]}
        onConfirm={onConfirm}
      />,
    );
    click(host.querySelector('[data-testid="pick-day"]'));
    // Hour stage → pick 14 from the inner ring, then the minute ring.
    click(tick(host, '۱۴'));
    click(tick(host, '۳۰'));
    click(host.querySelector('[data-testid="host-confirm"]'));
    expect(onConfirm).toHaveBeenCalledWith({
      ...DATE,
      hour: 14,
      minute: 30,
      second: 0,
    });
  });

  it('reports every time change through onTimeChange', () => {
    const onTimeChange = vi.fn();
    const host = render(
      <FakeDatePicker
        plugins={[timePlugin({ defaultValue: time(9, 0), onTimeChange })]}
      />,
    );
    click(tick(host, '۱۱'));
    expect(onTimeChange).toHaveBeenCalledWith(time(11, 0, 0));
  });

  it('forwards picker options through to the clock', () => {
    const host = render(
      <FakeDatePicker
        plugins={[timePlugin({ format: '12h', minuteInterval: 30 })]}
      />,
    );
    // 12-hour mode draws one ring of 12 and the ق.ظ/ب.ظ pills.
    expect(host.querySelectorAll('[role="radio"]')).toHaveLength(
      12 + 2, // 12 hour ticks + the two meridiem radios
    );
  });

  it('carries seconds when the clock shows them', () => {
    const plugin = timePlugin({ showSeconds: true });
    expect(plugin.extendValue?.(DATE, time(1, 2, 3))).toEqual({
      hour: 1,
      minute: 2,
      second: 3,
    });
  });

  it('lets two clocks coexist without sharing state', () => {
    const onConfirm = vi.fn();
    const host = render(
      <FakeDatePicker
        plugins={[
          timePlugin({ name: 'start', defaultValue: time(9, 0) }),
          timePlugin({ name: 'end', defaultValue: time(17, 0) }),
        ]}
        onConfirm={onConfirm}
      />,
    );
    click(host.querySelector('[data-testid="pick-day"]'));
    click(host.querySelector('[data-testid="host-confirm"]'));
    // Both extend the same keys, so the later plugin wins — which is the
    // documented ordering rule. What matters here is that they kept separate
    // state rather than one overwriting the other's.
    expect(onConfirm).toHaveBeenCalledWith({
      ...DATE,
      hour: 17,
      minute: 0,
      second: 0,
    });
  });
});
