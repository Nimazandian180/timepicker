import { useMemo, useState } from 'react';
import {
  JalaliTimePicker,
  formatDuration,
  formatTime,
  formatTimeRange,
  toISOTime,
  toMinutesOfDay,
  type DurationValue,
  type PickerMode,
  type TimeFormat,
  type TimePrecision,
  type TimeRange,
  type TimeValue,
} from '../src';
import { themes, themeOptions, type ThemeKey } from './theme';
import { Field, OutputRow, Panel, SegmentedControl, Toggle } from './ui';

type SelectionMode = 'single' | 'range' | 'duration';
type CommitMode = 'confirm' | 'instant';
type ConstraintSource = 'none' | 'office' | 'custom';

/** Business hours — the constraint everybody actually writes. */
const OFFICE = {
  minTime: { hour: 9, minute: 0, second: 0 },
  maxTime: { hour: 17, minute: 0, second: 0 },
};

/** Starting point for the custom-JSON editor. */
const SAMPLE_JSON = JSON.stringify(
  {
    minTime: { hour: 8, minute: 30, second: 0 },
    maxTime: { hour: 20, minute: 0, second: 0 },
    disabledHours: [13],
    disabledMinuteRanges: [{ from: 50, to: 59 }],
    disabledTimes: [{ hour: 10, minute: 30, second: 0 }],
  },
  null,
  2,
);

interface ParsedConstraints {
  minTime?: TimeValue | null;
  maxTime?: TimeValue | null;
  disabledHours?: number[];
  disabledMinutes?: number[];
  disabledMinuteRanges?: { from: number; to: number }[];
  disabledTimes?: TimeValue[];
}

/** Parse the editor text, returning a friendly error instead of throwing. */
function parseConstraints(text: string): {
  config: ParsedConstraints | null;
  error: string | null;
} {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return { config: null, error: (e as Error).message };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { config: null, error: 'Expected an object of constraints.' };
  }
  return { config: value as ParsedConstraints, error: null };
}

/** The rows shown in the Output panel, per selection mode. */
function describe(
  mode: SelectionMode,
  single: TimeValue | null,
  range: TimeRange | null,
  duration: DurationValue | null,
  format: TimeFormat,
  precision: TimePrecision,
): { label: string; value: string }[] {
  const options = { format, precision };

  if (mode === 'duration') {
    if (!duration) return [{ label: 'Value', value: '—' }];
    return [
      { label: 'Persian', value: formatDuration(duration) },
      { label: 'Compact', value: formatDuration(duration, { compact: true }) },
      {
        label: 'Object',
        value: `{ hours: ${duration.hours}, minutes: ${duration.minutes} }`,
      },
      {
        label: 'Total minutes',
        value: String(duration.hours * 60 + duration.minutes),
      },
    ];
  }

  if (mode === 'range') {
    if (!range) return [{ label: 'Value', value: '—' }];
    return [
      { label: 'Persian', value: formatTimeRange(range, options) },
      {
        label: 'ISO',
        value: `${toISOTime(range.start, precision)} – ${
          range.end ? toISOTime(range.end, precision) : '—'
        }`,
      },
      {
        label: 'Minutes of day',
        value: `${toMinutesOfDay(range.start)} – ${
          range.end ? toMinutesOfDay(range.end) : '—'
        }`,
      },
    ];
  }

  if (!single) return [{ label: 'Value', value: '—' }];
  return [
    { label: 'Persian', value: formatTime(single, options) },
    { label: 'ISO', value: toISOTime(single, precision) },
    {
      label: 'Object',
      value: `{ hour: ${single.hour}, minute: ${single.minute}, second: ${single.second} }`,
    },
    { label: 'Minutes of day', value: String(toMinutesOfDay(single)) },
  ];
}

/** The interactive demo: controls on one side, picker in the middle, output on the other. */
export function Playground() {
  const [theme, setTheme] = useState<ThemeKey>('gold');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [pickerMode, setPickerMode] = useState<PickerMode>('hybrid');
  const [format, setFormat] = useState<TimeFormat>('24h');
  const [commitMode, setCommitMode] = useState<CommitMode>('confirm');
  const [precision, setPrecision] = useState<TimePrecision>('minute');
  const [leadingZero, setLeadingZero] = useState(true);
  const [minuteInterval, setMinuteInterval] = useState(1);
  const [showFooter, setShowFooter] = useState(true);
  const [showNow, setShowNow] = useState(true);
  const [showClear, setShowClear] = useState(false);
  const [showTimezone, setShowTimezone] = useState(false);
  const [constraintSource, setConstraintSource] =
    useState<ConstraintSource>('none');
  const [customJson, setCustomJson] = useState(SAMPLE_JSON);

  const [single, setSingle] = useState<TimeValue | null>({
    hour: 10,
    minute: 30,
    second: 0,
  });
  const [range, setRange] = useState<TimeRange | null>({
    start: { hour: 9, minute: 0, second: 0 },
    end: { hour: 17, minute: 30, second: 0 },
  });
  const [duration, setDuration] = useState<DurationValue | null>({
    hours: 1,
    minutes: 30,
  });

  // `defaultValue` and the footer flags are read at mount, so re-mount when
  // they change. Constraints are NOT keyed here — the picker reacts to those
  // props live, so editing the JSON updates the clock without resetting it.
  const pickerKey = [
    selectionMode,
    pickerMode,
    commitMode,
    showFooter,
    precision,
  ].join('-');

  const parsed = useMemo(() => parseConstraints(customJson), [customJson]);

  const constraints =
    constraintSource === 'office'
      ? OFFICE
      : constraintSource === 'custom'
        ? (parsed.config ?? {})
        : {};

  const output = useMemo(
    () => describe(selectionMode, single, range, duration, format, precision),
    [selectionMode, single, range, duration, format, precision],
  );

  // `key` is passed separately at each call site: React refuses to read a key
  // out of a spread object, and silently treats it as a normal prop.
  const shared = {
    mode: pickerMode,
    format,
    precision,
    leadingZero,
    minuteInterval,
    commitMode,
    showFooter,
    showNow,
    showClear,
    timezone: showTimezone,
    ...constraints,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'minmax(260px, 320px) auto minmax(260px, 320px)',
          alignItems: 'start',
          justifyContent: 'center',
        }}
      >
        <Panel title="Options">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Selection">
              <SegmentedControl
                value={selectionMode}
                onChange={setSelectionMode}
                options={[
                  { value: 'single', label: 'Single' },
                  { value: 'range', label: 'Range' },
                  { value: 'duration', label: 'Duration' },
                ]}
              />
            </Field>
            <Field label="Picker mode">
              <SegmentedControl
                value={pickerMode}
                onChange={setPickerMode}
                options={[
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'analog', label: 'Analog' },
                  { value: 'digital', label: 'Digital' },
                ]}
              />
            </Field>
            <Field label="Format">
              <SegmentedControl
                value={format}
                onChange={setFormat}
                options={[
                  { value: '24h', label: '24-hour' },
                  { value: '12h', label: '12-hour' },
                ]}
              />
            </Field>
            <Field label="Commit mode">
              <SegmentedControl
                value={commitMode}
                onChange={setCommitMode}
                options={[
                  { value: 'confirm', label: 'Confirm' },
                  { value: 'instant', label: 'Instant' },
                ]}
              />
            </Field>
            <Field label="Theme">
              <SegmentedControl
                value={theme}
                onChange={setTheme}
                options={themeOptions}
              />
            </Field>
            <Field label={`Minute interval — ${minuteInterval}`}>
              <SegmentedControl
                value={String(minuteInterval)}
                onChange={(v) => setMinuteInterval(Number(v))}
                options={[
                  { value: '1', label: '1' },
                  { value: '5', label: '5' },
                  { value: '10', label: '10' },
                  { value: '15', label: '15' },
                  { value: '30', label: '30' },
                ]}
              />
            </Field>
            <Field label="Constraints">
              <SegmentedControl
                value={constraintSource}
                onChange={setConstraintSource}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'office', label: '9–17' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </Field>
            <Field label="Precision">
              <SegmentedControl
                value={precision}
                onChange={setPrecision}
                options={[
                  { value: 'hour', label: 'Hour' },
                  { value: 'minute', label: '+ Min' },
                  { value: 'second', label: '+ Sec' },
                ]}
              />
            </Field>
            <Toggle
              label="Leading zero"
              checked={leadingZero}
              onChange={setLeadingZero}
            />
            <Toggle
              label="Show footer"
              checked={showFooter}
              onChange={setShowFooter}
            />
            <Toggle
              label="Now button"
              checked={showNow}
              onChange={setShowNow}
            />
            <Toggle
              label="Clear button"
              checked={showClear}
              onChange={setShowClear}
            />
            <Toggle
              label="Timezone selector"
              checked={showTimezone}
              onChange={setShowTimezone}
            />
          </div>
        </Panel>

        <div
          style={{
            ...themes[theme].vars,
            display: 'flex',
            justifyContent: 'center',
            padding: theme === 'dark' ? 16 : 0,
            background: theme === 'dark' ? '#0c0a09' : 'transparent',
            borderRadius: 20,
          }}
        >
          {selectionMode === 'single' && (
            <JalaliTimePicker
              key={pickerKey}
              {...shared}
              selectionMode="single"
              defaultValue={single}
              onChange={setSingle}
              onConfirm={(v) => v && setSingle(v)}
            />
          )}
          {selectionMode === 'range' && (
            <JalaliTimePicker
              key={pickerKey}
              {...shared}
              selectionMode="range"
              defaultValue={range}
              onChange={setRange}
              onConfirm={(v) => v && setRange(v)}
            />
          )}
          {selectionMode === 'duration' && (
            <JalaliTimePicker
              key={pickerKey}
              {...shared}
              selectionMode="duration"
              defaultValue={duration}
              minDuration={15}
              maxDuration={8 * 60}
              onChange={setDuration}
              onConfirm={(v) => v && setDuration(v)}
            />
          )}
        </div>

        <Panel title="Output">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {output.map((row) => (
              <OutputRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </Panel>
      </div>

      {constraintSource === 'custom' && (
        <Panel title="Constraints (JSON)">
          <textarea
            value={customJson}
            onChange={(e) => setCustomJson(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 220,
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              fontSize: 13,
              lineHeight: 1.6,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${parsed.error ? '#dc2626' : 'var(--line)'}`,
              resize: 'vertical',
            }}
          />
          {parsed.error && (
            <p style={{ color: '#dc2626', fontSize: 13, margin: '8px 0 0' }}>
              {parsed.error}
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
