import { useMemo, useState } from 'react';

import { formatTime, type TimeValue } from '../src';
import { timePlugin } from '../src/plugin';
import type {
  AnyDatePickerPlugin,
  DatePickerPluginContext,
  JalaliDateLike,
} from '../src/plugin/types';
import { PLUGIN_INSTALL_CMD } from './links';
import { themes, themeOptions, type ThemeKey } from './theme';
import { CopyButton, Field, OutputRow, Panel, SegmentedControl } from './ui';

/**
 * Shows the picker working as a `jalali-datepicker` plugin.
 *
 * The demo does **not** depend on the date picker — that would defeat the point
 * of it being an optional peer, and would mean this showcase could not be built
 * without it. Instead it uses a minimal host that implements the same contract:
 * enough to prove the wiring, and honest about what it is.
 */

const DATE: JalaliDateLike = { year: 1404, month: 5, day: 17 };

const SNIPPET = `import { JalaliDatePicker } from '@aliasadollahi/jalali-datepicker';
import { timePlugin } from '@aliasadollahi/jalali-timepicker/plugin';
import '@aliasadollahi/jalali-datepicker/styles.css';
import '@aliasadollahi/jalali-timepicker/styles.css';

const plugins = [timePlugin({ format: '24h', minuteInterval: 15 })];

<JalaliDatePicker
  plugins={plugins}
  onConfirm={(value) => {
    // { year, month, day, hour, minute, second }
  }}
/>;`;

/** A stand-in host implementing the date picker's plugin contract. */
function MiniHost<TExtra extends object>({
  plugins,
  onConfirm,
}: {
  plugins: readonly AnyDatePickerPlugin<TExtra>[];
  onConfirm: (value: (JalaliDateLike & TExtra) | null) => void;
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

  const extend = () => {
    let out: object = DATE;
    for (const plugin of plugins) {
      if (!plugin.extendValue) continue;
      out = {
        ...out,
        ...plugin.extendValue(DATE, store[plugin.name]),
      };
    }
    return out as JalaliDateLike & TExtra;
  };

  return (
    <div
      dir="rtl"
      lang="fa"
      style={{
        width: '18rem',
        padding: 12,
        background: '#fff',
        border: '1px solid #e5e5e5',
        borderRadius: 14,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)',
        fontFamily: "'Vazirmatn', sans-serif",
      }}
    >
      {/* Stands in for the calendar the real host would draw here. */}
      <div
        style={{
          padding: '28px 12px',
          textAlign: 'center',
          color: '#737373',
          background: '#f7f7f7',
          borderRadius: 10,
          fontSize: 13,
        }}
      >
        تقویم (JalaliDatePicker)
        <div style={{ marginTop: 6, color: '#171717', fontWeight: 600 }}>
          ۱۷ مرداد ۱۴۰۴
        </div>
      </div>

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
          selection: DATE,
          selectionMode: 'single',
          view: 'day',
          today: DATE,
          mode: 'confirm',
          isEmpty: false,
          confirm: () => onConfirm(extend()),
          cancel: () => {},
        };
        return (
          <div
            key={plugin.name}
            style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: '1px solid #e5e5e5',
            }}
          >
            {plugin.render?.(ctx)}
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          paddingTop: 8,
          borderTop: '1px solid #e5e5e5',
        }}
      >
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => onConfirm(extend())}
          style={{
            height: 36,
            padding: '0 14px',
            border: 0,
            borderRadius: 10,
            background: '#e4ae21',
            color: '#171717',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          تأیید
        </button>
      </div>
    </div>
  );
}

export function PluginDemo() {
  const [theme, setTheme] = useState<ThemeKey>('gold');
  const [result, setResult] = useState<
    (JalaliDateLike & { hour: number; minute: number; second: number }) | null
  >(null);

  // Hoisted out of render: a new array identity every pass would re-render the
  // slot needlessly, which is exactly what the docs tell consumers to avoid.
  const plugins = useMemo(
    () => [
      timePlugin({
        format: '24h',
        minuteInterval: 15,
        defaultValue: { hour: 9, minute: 0, second: 0 } as TimeValue,
      }),
    ],
    [],
  );

  return (
    <Panel title="As a date-picker plugin">
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--muted)' }}>
        The time picker ships an optional adapter that turns it into a{' '}
        <code>jalali-datepicker</code> plugin. Neither package depends on the
        other — the contract is matched structurally — so you can install either
        one alone.
      </p>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--ink)',
          color: '#fafaf9',
          padding: '8px 8px 8px 20px',
          borderRadius: 12,
          fontSize: 14,
          marginBottom: 24,
        }}
      >
        <code style={{ background: 'transparent' }}>{PLUGIN_INSTALL_CMD}</code>
        <CopyButton text={PLUGIN_INSTALL_CMD} />
      </div>

      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'auto minmax(280px, 1fr)',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            ...themes[theme].vars,
            padding: theme === 'dark' ? 16 : 0,
            background: theme === 'dark' ? '#0c0a09' : 'transparent',
            borderRadius: 20,
          }}
        >
          <MiniHost plugins={plugins} onConfirm={setResult} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Theme">
            <SegmentedControl
              value={theme}
              onChange={setTheme}
              options={themeOptions}
            />
          </Field>

          <pre
            style={{
              margin: 0,
              padding: 16,
              background: '#1c1917',
              color: '#fafaf9',
              borderRadius: 12,
              fontSize: 12.5,
              lineHeight: 1.7,
              overflowX: 'auto',
            }}
          >
            <code>{SNIPPET}</code>
          </pre>

          <div>
            <OutputRow
              label="onConfirm value"
              value={result ? JSON.stringify(result) : '—'}
            />
            <OutputRow
              label="Time"
              value={result ? formatTime(result as TimeValue) : '—'}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}
