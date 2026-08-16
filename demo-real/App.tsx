import { useMemo, useState } from 'react';

// The real package, aliased to the sibling source by vite.real.config.ts.
import {
  JalaliDatePicker,
  toJalali,
  toGregorian,
} from '@aliasadollahi/jalali-datepicker';

import { timePlugin } from '../src/plugin';
import { formatTime, type TimeValue } from '../src';

/**
 * SCRATCH DEMO — not part of the project, not committed.
 *
 * The shipped showcase uses a stand-in host, because the date picker is only an
 * optional peer and the demo must build without it. This one wires up the
 * genuine `<JalaliDatePicker>` so the integration can be seen end to end.
 */

type Confirmed =
  | ({ year: number; month: number; day: number } & {
      hour: number;
      minute: number;
      second: number;
    })
  | null;

const card = {
  background: 'var(--panel)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: 24,
} as const;

const FONT = { ['--jdp-font' as string]: "'Vazirmatn', sans-serif" };
const GOLD = {
  ...FONT,
  ['--jdp-primary' as string]: '#e4ae21',
  ['--jdp-selected-bg' as string]: '#e4ae21',
  ['--jdp-selected-fg' as string]: '#1c1917',
  ['--jdp-selected-off-fg' as string]: '#1c1917',
  ['--jdp-range-bg' as string]: '#fbf3dc',
  ['--jtp-font' as string]: "'Vazirmatn', sans-serif",
  ['--jtp-primary' as string]: '#e4ae21',
  ['--jtp-face-bg' as string]: '#fbf3dc',
};

export function App() {
  const [single, setSingle] = useState<Confirmed>(null);
  const [tabbed, setTabbed] = useState<Confirmed>(null);
  const [stepped, setStepped] = useState<Confirmed>(null);
  const [ranged, setRanged] = useState<unknown>(null);
  const [live, setLive] = useState<TimeValue | null>(null);

  // Hoisted per the docs: a new array identity each render re-renders the slot.
  const plugins = useMemo(
    () => [
      timePlugin({
        format: '24h',
        minuteInterval: 15,
        defaultValue: { hour: 9, minute: 0, second: 0 },
        onTimeChange: setLive,
      }),
    ],
    [],
  );

  // A second calendar, in range mode, with the clock in the footer slot and
  // seconds on — to show the slot and the options really are per-plugin.
  const rangePlugins = useMemo(
    () => [
      timePlugin({
        name: 'time',
        slot: 'footer',
        format: '12h',
        showSeconds: true,
        defaultValue: { hour: 13, minute: 45, second: 30 },
      }),
    ],
    [],
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 30, margin: '8px 0 4px' }}>
        Real <code>JalaliDatePicker</code> + <code>timePlugin()</code>
      </h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        This page imports the actual date picker from{' '}
        <code>../jalali-datepicker/src</code> — no stand-in host.
      </p>

      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'start',
          marginTop: 24,
        }}
      >
        {/* ---------- single date + time ---------- */}
        <section style={card}>
          <h2 style={{ fontSize: 15, margin: '0 0 16px' }}>
            Single date + time — panel slot, 24h, 15-minute interval
          </h2>
          <div style={GOLD}>
            <JalaliDatePicker
              plugins={plugins}
              defaultValue={{ year: 1404, month: 5, day: 17 }}
              onConfirm={(value) => setSingle(value as Confirmed)}
            />
          </div>

          <div style={{ marginTop: 16, fontSize: 13.5 }}>
            <Row label="onTimeChange" value={live ? formatTime(live) : '—'} />
            <Row
              label="onConfirm"
              value={single ? JSON.stringify(single) : '— press تأیید —'}
            />
            <Row
              label="Jalali"
              value={
                single
                  ? `${toJalali(single, 'dddd D MMMM YYYY')} — ${formatTime(single)}`
                  : '—'
              }
            />
            <Row
              label="Gregorian"
              value={
                single
                  ? `${toGregorian(single, 'YYYY-MM-DD')}T${String(
                      single.hour,
                    ).padStart(
                      2,
                      '0',
                    )}:${String(single.minute).padStart(2, '0')}`
                  : '—'
              }
            />
          </div>
        </section>

        {/* ---------- tabs ---------- */}
        <section style={card}>
          <h2 style={{ fontSize: 15, margin: '0 0 16px' }}>
            <code>pluginLayout="tabs"</code> — تاریخ / ساعت, switch any time
          </h2>
          <div style={GOLD}>
            <JalaliDatePicker
              pluginLayout="tabs"
              plugins={plugins}
              defaultValue={{ year: 1404, month: 5, day: 17 }}
              onConfirm={(value) => setTabbed(value as Confirmed)}
            />
          </div>
          <div style={{ marginTop: 16, fontSize: 13.5 }}>
            <Row
              label="onConfirm"
              value={tabbed ? JSON.stringify(tabbed) : '— press تأیید —'}
            />
          </div>
        </section>

        {/* ---------- steps ---------- */}
        <section style={card}>
          <h2 style={{ fontSize: 15, margin: '0 0 16px' }}>
            <code>pluginLayout="steps"</code> — pick a day, it moves on by
            itself
          </h2>
          <div style={GOLD}>
            <JalaliDatePicker
              pluginLayout="steps"
              plugins={plugins}
              onConfirm={(value) => setStepped(value as Confirmed)}
            />
          </div>
          <div style={{ marginTop: 16, fontSize: 13.5 }}>
            <Row
              label="onConfirm"
              value={stepped ? JSON.stringify(stepped) : '— pick a day —'}
            />
          </div>
        </section>

        {/* ---------- range + time in the footer slot ---------- */}
        <section style={card}>
          <h2 style={{ fontSize: 15, margin: '0 0 16px' }}>
            Range + time — inline, footer slot, 12h, seconds on
          </h2>
          <div style={GOLD}>
            <JalaliDatePicker
              selectionMode="range"
              plugins={rangePlugins}
              onConfirm={(value) => setRanged(value)}
            />
          </div>
          <div style={{ marginTop: 16, fontSize: 13.5 }}>
            <Row
              label="onConfirm"
              value={
                ranged ? JSON.stringify(ranged) : '— pick two days, تأیید —'
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        justifyContent: 'space-between',
        padding: '8px 0',
        borderTop: '1px solid var(--line)',
      }}
    >
      <span style={{ color: 'var(--muted)', flex: 'none' }}>{label}</span>
      <code style={{ textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </code>
    </div>
  );
}
