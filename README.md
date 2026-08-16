# @aliasadollahi/jalali-timepicker

A self-contained, RTL-first **Persian time picker for React** — an analog clock,
digital fields, or both. 12/24-hour, range and duration modes, minute intervals,
constraints, optional timezone, fully keyboard accessible, themeable with CSS
variables. No Tailwind, no UI-library dependency, no runtime dependencies at all.

It works on its own, and it plugs into
[`@aliasadollahi/jalali-datepicker`](https://www.npmjs.com/package/@aliasadollahi/jalali-datepicker)
to become a date **and** time picker. Neither package depends on the other.

```bash
npm i @aliasadollahi/jalali-timepicker
```

```tsx
import { JalaliTimePicker } from '@aliasadollahi/jalali-timepicker';
import '@aliasadollahi/jalali-timepicker/styles.css';

<JalaliTimePicker
  defaultValue={{ hour: 10, minute: 30, second: 0 }}
  onConfirm={(value) => console.log(value)} // { hour, minute, second }
/>;
```

---

## Contents

- [Why](#why)
- [Install](#install)
- [Quick start](#quick-start)
- [Modes](#modes)
- [Time formats](#time-formats)
- [Minute intervals](#minute-intervals)
- [Constraints](#constraints)
- [Range mode](#range-mode)
- [Duration mode](#duration-mode)
- [Timezones](#timezones)
- [Actions and commit modes](#actions-and-commit-modes)
- [Using it with the date picker](#using-it-with-the-date-picker)
- [Theming](#theming)
- [Accessibility](#accessibility)
- [Mobile](#mobile)
- [Headless hook](#headless-hook)
- [Formatting and parsing](#formatting-and-parsing)
- [API reference](#api-reference)
- [SSR](#ssr)
- [Development](#development)

---

## Why

Most time pickers are either a bare `<input type="time">` — which renders in the
browser's locale, ignores Persian digits and cannot be themed — or a large
component from a design system you then have to adopt wholesale.

This one:

- **Ships its own look.** One stylesheet, themed entirely with `--jtp-*` CSS
  variables. It does not read your design tokens and it does not need Tailwind.
- **Stores time, not presentation.** The value is always 24-hour
  `{ hour, minute, second }`. Switching between 12h and 24h cannot change it.
- **Has no runtime dependencies.** Not even a date library — it is integer maths
  on hours and minutes.
- **Is RTL by construction**, while keeping `10:30` left-to-right, because a
  time is a number and not a sentence.
- **Is headless underneath.** `useJalaliTimePicker` gives you positioned clock
  ticks, hand angles and every action; the bundled UI is one consumer of it.

---

## Install

```bash
npm i @aliasadollahi/jalali-timepicker
```

Peer dependencies:

| Package                            | Required?    | Why                                 |
| ---------------------------------- | ------------ | ----------------------------------- |
| `react` >= 18                      | **yes**      | The component is React.             |
| `@aliasadollahi/jalali-datepicker` | **optional** | Only for the `/plugin` entry point. |

Installing the date picker is optional — npm will note the unmet optional peer
and carry on. Install it only if you want the calendar integration:

```bash
npm i @aliasadollahi/jalali-datepicker @aliasadollahi/jalali-timepicker
```

Then import the stylesheet once, anywhere in your app:

```tsx
import '@aliasadollahi/jalali-timepicker/styles.css';
```

---

## Quick start

```tsx
import { useState } from 'react';
import {
  JalaliTimePicker,
  formatTime,
  type TimeValue,
} from '@aliasadollahi/jalali-timepicker';
import '@aliasadollahi/jalali-timepicker/styles.css';

export function MeetingTime() {
  const [time, setTime] = useState<TimeValue | null>(null);

  return (
    <>
      <JalaliTimePicker format="12h" minuteInterval={15} onConfirm={setTime} />
      <p>{time ? formatTime(time, { format: '12h' }) : 'زمانی انتخاب نشده'}</p>
    </>
  );
}
```

The picker is **inline** — it renders a card, not a field. Pair it with any
popover, dialog or sheet you already use; it takes no opinion on how it is
presented.

---

## Modes

`mode` chooses which surface the user gets.

| `mode`      | What renders                                      |
| ----------- | ------------------------------------------------- |
| `'hybrid'`  | Both, with a عقربه‌ای / عددی switch. **Default.** |
| `'analog'`  | The clock face only.                              |
| `'digital'` | The editable fields only.                         |

```tsx
<JalaliTimePicker mode="analog" />
<JalaliTimePicker mode="digital" showSeconds />
```

Both surfaces read and write the same state, so a change in one is immediately
visible in the other.

### The clock flow

1. The picker opens on the hour stage.
2. Tapping (or dragging to) an hour advances to minutes.
3. Picking minutes advances to seconds — but only when `showSeconds` is on.
4. The big reading at the top is clickable: tap the hour to go back to it.

The hand can be **dragged**, not just tapped. It follows the pointer
continuously, snaps to `minuteInterval`, and commits when you let go.

**There is only ever one hand** — the one for the unit you are choosing. This is
a picker, not a wall clock: a hand here means "this is your selection", so an
idle hand beside it would only be another needle to mistake for the live one.
With `showSeconds` off there is no seconds hand at all; with it on, that same
single hand carries you through the seconds ring.

---

## Time formats

```tsx
<JalaliTimePicker format="24h" />   {/* ۲۲:۳۰      — the default */}
<JalaliTimePicker format="12h" />   {/* ۱۰:۳۰ ب.ظ  — with ق.ظ/ب.ظ pills */}
```

In 24-hour mode the clock draws **two rings**: 1–12 on the outside and 13–۰۰ on
the inside, the layout desktop clocks use. In 12-hour mode there is one ring and
the ق.ظ/ب.ظ pills decide the half of the day.

Switching format **never changes the value**. The state is 24-hour throughout;
`format` only decides how it is drawn. `09:00` shown as `۰۹:۰۰ ق.ظ` and toggled
to 24-hour is still `09:00`.

`leadingZero` controls padding of the hour only — minutes and seconds are always
padded, because `9:5` is not a time anyone writes.

```tsx
<JalaliTimePicker leadingZero={false} />  {/* ۹:۰۵ instead of ۰۹:۰۵ */}
```

---

## Minute intervals

```tsx
<JalaliTimePicker minuteInterval={15} />
```

Any number is accepted; 1, 5, 10, 15 and 30 are the common ones.

Three things follow from the interval:

- The minute hand **snaps** to it while dragging.
- The increment/decrement controls step by a whole interval — the up arrow on a
  15-minute picker goes `:00 → :15`, not `:00 → :01`.
- The minute ring **redraws itself**: at an interval that divides the hour
  evenly, a 15-minute picker shows ۰۰ ۱۵ ۳۰ ۴۵ instead of drawing eight numbers
  it would only have to grey out. A custom interval that does not divide 60
  (say 7) keeps the familiar 5-step ring, with the unreachable ticks disabled.

---

## Constraints

Everything is optional and everything composes — a time is selectable only if it
clears every rule.

```tsx
<JalaliTimePicker
  minTime={{ hour: 9, minute: 0, second: 0 }}
  maxTime={{ hour: 17, minute: 0, second: 0 }}
  disabledHours={[13]}                               {/* lunch */}
  disabledMinuteRanges={[{ from: 50, to: 59 }]}      {/* last 10 of each hour */}
  disabledTimes={[{ hour: 10, minute: 30, second: 0 }]}
  disabledTime={(t) => t.hour === 15 && t.minute > 30}
/>
```

| Prop                   | Meaning                                       |
| ---------------------- | --------------------------------------------- |
| `minTime` / `maxTime`  | Inclusive bounds.                             |
| `disabledHours`        | Whole hours, 0–23.                            |
| `disabledMinutes`      | Minutes-past-the-hour, applied to every hour. |
| `disabledMinuteRanges` | `{ from, to }` spans, inclusive at both ends. |
| `disabledTimes`        | Individual times — booked slots.              |
| `disabledTime`         | Predicate escape hatch. Hoist or memoize it.  |

An **hour tick is only greyed out when every reachable minute inside it is
ruled out**. Blocking 09:15 does not make the whole 9 o'clock unreachable, but
blocking both :00 and :30 on a 30-minute interval does.

When the draft breaks a rule the picker shows a Persian message and **disables
تأیید**, so an invalid value can never be committed. Hide the message with
`showError={false}` — the button stays disabled either way.

`اکنون` lands on the _nearest allowed_ time: pressed at 20:00 with business-hours
constraints, it gives 17:00 rather than a value that would be rejected.

---

## Range mode

```tsx
<JalaliTimePicker
  selectionMode="range"
  defaultValue={{
    start: { hour: 9, minute: 0, second: 0 },
    end: { hour: 17, minute: 30, second: 0 },
  }}
  onConfirm={(range) => console.log(range)} // { start, end }
/>
```

Both endpoints are shown as tabs (از / تا) with their current values; tapping one
makes it the endpoint the clock edits. The active tab is marked by a border
**and** a fill, not by colour alone.

By default the end cannot fall before the start — pushing it earlier pins it to
the start instead. For a span that legitimately crosses midnight (a night
shift), turn that off:

```tsx
<JalaliTimePicker selectionMode="range" sameDay={false} />;
{
  /* 22:00 – 06:00 is now allowed */
}
```

---

## Duration mode

A length of time rather than a point in it.

```tsx
<JalaliTimePicker
  selectionMode="duration"
  defaultValue={{ hours: 1, minutes: 30 }}
  minDuration={15} // minutes
  maxDuration={8 * 60}
  onConfirm={(d) => console.log(d)} // { hours: 1, minutes: 30 }
/>
```

The reading becomes «۱ ساعت و ۳۰ دقیقه» and the ق.ظ/ب.ظ pills disappear — a
duration has no morning or afternoon.

**One limit worth knowing:** the analog face reuses the clock dial, so it can
only express durations under 24 hours. Longer durations are still valid and are
kept exactly — set them through the digital fields, `defaultValue`, or a
controlled `value`. `maxDuration` is the real bound.

---

## Timezones

Off by default, so the basic picker stays simple.

```tsx
<JalaliTimePicker
  timezone
  timezoneValue={zone}
  onTimezoneChange={setZone}
  timezones={['Asia/Tehran', 'UTC', 'Europe/Berlin']}
/>
```

No tz database is bundled — `Intl` already has one in every supported browser
and Node build, so offsets are read from it and stay correct as rules change.

Selecting a zone **labels** the value; it does not move the hands. A user who
typed 10:30 means 10:30. If you need to rebase an instant, the conversion is
exported for you to call deliberately:

```tsx
import { convertTime } from '@aliasadollahi/jalali-timepicker';

convertTime({ hour: 10, minute: 30, second: 0 }, 'Asia/Tehran', 'UTC');
```

---

## Actions and commit modes

```tsx
<JalaliTimePicker
  showNow // اکنون    — default true
  showClear // پاک کردن — default false
  showCancel // لغو      — default true
  showDone // تأیید    — default true
  showFooter // the whole row — default true
  onCancel={() => close()}
  onClear={() => setValue(null)}
/>
```

`commitMode` decides _when_ a change reaches you:

| `commitMode` | Behaviour                                                       |
| ------------ | --------------------------------------------------------------- |
| `'confirm'`  | Changes stage a draft; `onConfirm` fires on تأیید. **Default.** |
| `'instant'`  | `onChange` fires on every change; there is nothing to confirm.  |

Controlled and uncontrolled both work, as usual: pass `value` + `onChange` for
controlled, `defaultValue` for uncontrolled.

---

## Using it with the date picker

The date picker exposes a generic plugin API. This package ships an adapter for
it under a **separate entry point**, so consumers who never touch the calendar
never pull it into their bundle.

```tsx
import { JalaliDatePicker } from '@aliasadollahi/jalali-datepicker';
import { timePlugin } from '@aliasadollahi/jalali-timepicker/plugin';
import '@aliasadollahi/jalali-datepicker/styles.css';
import '@aliasadollahi/jalali-timepicker/styles.css';

// Hoist or memoize — a new array identity every render re-renders the slot.
const plugins = [timePlugin({ format: '24h', minuteInterval: 15 })];

<JalaliDatePicker
  plugins={plugins}
  onConfirm={(value) => {
    // { year, month, day, hour, minute, second } — inferred, not cast
  }}
/>;
```

The clock renders inside the calendar's card, drops its own chrome and footer
(the host owns those), and merges its time into whatever the date picker emits.
The combined shape shows up **in the types**, so `value.hour` typechecks.

### `timePlugin(options)`

Takes every `JalaliTimePicker` prop except the value/callback ones, plus:

| Option         | Default   | Meaning                                              |
| -------------- | --------- | ---------------------------------------------------- |
| `slot`         | `'panel'` | Where it renders: `'header'`, `'panel'`, `'footer'`. |
| `defaultValue` | midnight  | The time it starts on.                               |
| `onTimeChange` | —         | Fires on every time change, independent of the date. |
| `name`         | `'time'`  | Unique id. Change it to mount two clocks at once.    |

Two clocks in one calendar — a start and an end — need distinct names, since the
host keys plugin state by name:

```tsx
const plugins = [
  timePlugin({
    name: 'start',
    defaultValue: { hour: 9, minute: 0, second: 0 },
  }),
  timePlugin({ name: 'end', slot: 'footer' }),
];
```

### Why there is no shared "core" package

Neither package depends on the other, in either direction:

- The **date picker** defines the plugin contract and knows nothing about time.
- The **time picker** declares a matching interface of its own
  (`src/plugin/types.ts`) and never imports the date picker — not even for
  types. TypeScript matches interfaces by shape, so the adapter satisfies the
  real contract structurally.

That means no dependency cycle exists to break, and no third package is needed.
The cost is that the two declarations must be kept in step by hand; that is paid
for by `src/plugin/plugin.test.tsx`, which drives the adapter through a host
implementing the contract, so drift fails CI rather than a consumer's build.

---

## Theming

Every visual value is a `--jtp-*` custom property. Set any of them on an
ancestor and it cascades in.

```css
.my-app {
  --jtp-primary: #2563eb;
  --jtp-primary-fg: #ffffff;
  --jtp-face-bg: #eff6ff;
  --jtp-clock-size: 18rem;
  --jtp-radius: 20px;
}
```

### Colour

| Variable            | Default   | What it paints                         |
| ------------------- | --------- | -------------------------------------- |
| `--jtp-bg`          | `#ffffff` | Card background.                       |
| `--jtp-fg`          | `#171717` | Primary text.                          |
| `--jtp-muted-fg`    | `#737373` | Labels, inactive units.                |
| `--jtp-disabled-fg` | `#a3a3a3` | Disabled ticks and controls.           |
| `--jtp-border`      | `#e5e5e5` | Card border, dividers, field borders.  |
| `--jtp-hover-bg`    | `#f5f5f5` | Hover fill.                            |
| `--jtp-selected-bg` | `#e6eaed` | Active meridiem pill, active endpoint. |
| `--jtp-selected-fg` | `#171717` | Text on the above.                     |
| `--jtp-primary`     | `#e4ae21` | The hand, its knob, تأیید.             |
| `--jtp-primary-fg`  | `#171717` | Text on the primary fill.              |
| `--jtp-focus-ring`  | `#e4ae21` | Keyboard focus outline.                |
| `--jtp-danger`      | `#f55959` | The validation message.                |

### Clock face

| Variable            | Default         | What it controls                       |
| ------------------- | --------------- | -------------------------------------- |
| `--jtp-face-bg`     | `#f7f7f7`       | The dial.                              |
| `--jtp-face-border` | `transparent`   | Dial outline.                          |
| `--jtp-hand`        | `--jtp-primary` | The hand and the centre pin.           |
| `--jtp-hand-width`  | `2px`           | Hand thickness.                        |
| `--jtp-tick-size`   | `2rem`          | Hit area of each number, and the knob. |
| `--jtp-center-size` | `0.5rem`        | The pin at the dial's centre.          |

### Metrics

| Variable                  | Default   | What it controls                  |
| ------------------------- | --------- | --------------------------------- |
| `--jtp-clock-size`        | `15rem`   | Dial diameter. Everything scales. |
| `--jtp-width`             | `18rem`   | Card width.                       |
| `--jtp-radius`            | `14px`    | Card corner radius.               |
| `--jtp-control-radius`    | `10px`    | Buttons and fields.               |
| `--jtp-display-font-size` | `2rem`    | The big reading.                  |
| `--jtp-font`              | `inherit` | Font family.                      |
| `--jtp-shadow`            | …         | Card shadow.                      |

The defaults deliberately match the date picker's `--jdp-*` palette value for
value, so the two sit together in one popover without either being re-themed.

### Dark theme

```css
[data-theme='dark'] {
  --jtp-bg: #1c1917;
  --jtp-fg: #fafaf9;
  --jtp-muted-fg: #a8a29e;
  --jtp-disabled-fg: #57534e;
  --jtp-border: #3f3b38;
  --jtp-hover-bg: #292524;
  --jtp-face-bg: #292524;
  --jtp-selected-bg: #e4ae21;
  --jtp-selected-fg: #1c1917;
}
```

---

## Accessibility

- The clock face is a single `radiogroup` and a single tab stop; the ticks are
  `radio`s kept out of the tab order. Tabbing through 60 minute ticks would be
  unusable, so the group owns focus — the standard pattern for a radio set.
- **Arrow keys** step the value (Right/Up clockwise, Left/Down anticlockwise, by
  a whole `minuteInterval` in the minute stage). **Enter** or **Space** commits
  and advances the stage. **Escape** cancels.
- Escape is handled on the card, not on `window`, so it never steals the key
  from a host that has its own handler.
- Every tick is labelled with its unit — «۳ ساعت», not «۳» — because a bare
  number tells a screen reader nothing.
- The big reading sits in an `aria-live="polite"` region as one string, so the
  change is announced as «۱۰:۳۰ ق.ظ» rather than three unrelated numbers.
- Selection is **never communicated by colour alone**: the selected tick carries
  `aria-checked`, the hand and the knob; the active display unit uses
  `aria-pressed`; the active range endpoint gets a border as well as a fill.
- The validation message is `role="alert"`, so it is announced when it appears.
- Digital fields are `spinbutton`s with `aria-valuemin`/`max`/`now`, and mark
  out-of-range text with `aria-invalid` as it is typed.
- Animation is dropped under `prefers-reduced-motion`.

---

## Mobile

- All pointer handling is Pointer Events, so touch, mouse and pen take one code
  path.
- The face sets `touch-action: none`, so dragging a hand does not scroll the
  page — the single most common failure in a touch clock.
- The gesture uses pointer capture, so a drag keeps tracking after the finger
  leaves the dial and still ends correctly when released outside it.
- Under `@media (pointer: coarse)` the dial grows to 17rem, tick hit areas to
  2.5rem, and the buttons to 2.75rem — keyed off the input device, so it needs
  no configuration and cannot be set wrong.
- The digital reading stays visible above the clock at every size.

---

## Headless hook

`useJalaliTimePicker` holds all the state and computes the geometry; the bundled
UI is just one consumer of it. Use it to build a completely different clock.

```tsx
import { useJalaliTimePicker } from '@aliasadollahi/jalali-timepicker';

function MyClock() {
  const clock = useJalaliTimePicker({ format: '12h', minuteInterval: 5 });

  return (
    <div>
      <output>{clock.displayText}</output>
      {clock.ticks.map((tick) => (
        <button
          key={tick.key}
          disabled={tick.isDisabled}
          style={{
            position: 'absolute',
            left: `${tick.x}%`,
            top: `${tick.y}%`,
          }}
          onClick={() => clock.selectTick(tick.position, tick.isInner)}
        >
          {tick.label}
        </button>
      ))}
      <div style={{ transform: `rotate(${clock.hands.hour}deg)` }} />
    </div>
  );
}
```

Ticks arrive **already positioned** — `x`/`y` are percentages of the face box, so
the whole clock scales with one CSS size and needs no measurement.

Note `tick.position` versus `tick.value`: `value` is the real hour/minute,
`position` is the spoke it sits on. On a 24-hour face two hours share a spoke
(3 and 15), told apart by `isInner`. A drag can only ever produce a position, so
positions are the space every selection call speaks.

---

## Formatting and parsing

```tsx
import {
  formatTime,
  formatTimeRange,
  formatDuration,
  toISOTime,
  toDate,
  parseTime,
} from '@aliasadollahi/jalali-timepicker';

formatTime({ hour: 22, minute: 30, second: 0 }); // '۲۲:۳۰'
formatTime({ hour: 22, minute: 30, second: 0 }, { format: '12h' }); // '۱۰:۳۰ ب.ظ'
formatTime({ hour: 9, minute: 5, second: 0 }, { leadingZero: false }); // '۹:۰۵'
formatTime({ hour: 22, minute: 30, second: 0 }, { persianDigits: false }); // '22:30'

formatTimeRange({ start: t1, end: t2 }); // '۰۹:۰۰ – ۱۷:۳۰'
formatDuration({ hours: 1, minutes: 30 }); // '۱ ساعت و ۳۰ دقیقه'
toISOTime({ hour: 9, minute: 5, second: 0 }); // '09:05' — Latin, 24-hour
toDate({ hour: 9, minute: 5, second: 0 }); // a Date on today's date
```

Parsing is permissive about **shape** and strict about **range**, because people
type all of these and they all mean the same time:

```tsx
parseTime('21:30'); // { hour: 21, minute: 30, second: 0 }
parseTime('۰۹:۰۵'); // Persian digits
parseTime('٠٩:٠٥'); // Arabic-Indic digits
parseTime('9.30'); // any sane separator
parseTime('0930'); // 4-digit shorthand
parseTime('۹:۳۰ ب.ظ'); // → 21:30
parseTime('9:30 P.M.'); // → 21:30
parseTime('9:30', { meridiem: 'pm' }); // assumed half of the day

parseTime('25:00'); // null — out of range
parseTime('abc'); // null
```

It returns `null` rather than a best guess, so a half-typed `1` is never turned
into `01:00` while the user is still typing the `4` of `14`.

---

## API reference

### `<JalaliTimePicker>`

| Prop                     | Type                                | Default     |
| ------------------------ | ----------------------------------- | ----------- |
| `selectionMode`          | `'single' \| 'range' \| 'duration'` | `'single'`  |
| `mode`                   | `'hybrid' \| 'analog' \| 'digital'` | `'hybrid'`  |
| `format`                 | `'12h' \| '24h'`                    | `'24h'`     |
| `value`                  | matches `selectionMode`             | —           |
| `defaultValue`           | matches `selectionMode`             | —           |
| `onChange`               | `(value) => void`                   | —           |
| `onConfirm`              | `(value \| null) => void`           | —           |
| `onCancel` / `onClear`   | `() => void`                        | —           |
| `showSeconds`            | `boolean`                           | `false`     |
| `minuteInterval`         | `number`                            | `1`         |
| `leadingZero`            | `boolean`                           | `true`      |
| `minTime` / `maxTime`    | `TimeValue \| null`                 | —           |
| `disabledHours`          | `readonly number[]`                 | —           |
| `disabledMinutes`        | `readonly number[]`                 | —           |
| `disabledMinuteRanges`   | `readonly { from, to }[]`           | —           |
| `disabledTimes`          | `readonly TimeValue[]`              | —           |
| `disabledTime`           | `(value) => boolean`                | —           |
| `showError`              | `boolean`                           | `true`      |
| `commitMode`             | `'confirm' \| 'instant'`            | `'confirm'` |
| `showFooter`             | `boolean`                           | `true`      |
| `showNow`                | `boolean`                           | `true`      |
| `showClear`              | `boolean`                           | `false`     |
| `showCancel`             | `boolean`                           | `true`      |
| `showDone`               | `boolean`                           | `true`      |
| `now`                    | `TimeValue \| null`                 | ambient     |
| `timezone`               | `boolean`                           | `false`     |
| `timezoneValue`          | `string`                            | viewer's    |
| `onTimezoneChange`       | `(zone: string) => void`            | —           |
| `timezones`              | `readonly string[]`                 | common list |
| `sameDay` (range)        | `boolean`                           | `true`      |
| `minDuration` (duration) | `number \| null` (minutes)          | —           |
| `maxDuration` (duration) | `number \| null` (minutes)          | —           |
| `className`              | `string`                            | —           |

### Types

```ts
interface TimeValue {
  hour: number;
  minute: number;
  second: number;
} // always 24-hour
interface TimeRange {
  start: TimeValue;
  end: TimeValue | null;
}
interface DurationValue {
  hours: number;
  minutes: number;
}
```

---

## SSR

The component is safe to render on a server — it touches no browser API during
render, and the CSS module is emitted as a plain stylesheet.

One caveat, the same one the date picker has: `now` defaults to the ambient
clock, so a server rendering at 10:29 and a browser hydrating at 10:30 disagree.
Inject it to make the render deterministic:

```tsx
<JalaliTimePicker now={{ hour: 9, minute: 0, second: 0 }} />
<JalaliTimePicker now={null} />  // no "now" at all
```

---

## Development

```bash
npm install
npm test              # vitest
npm run test:timezones # the suite under UTC, New York and Tehran
npm run typecheck
npm run lint
npm run build         # library → dist/
npm run check:dist    # load dist/ in plain Node, both entries, ESM + CJS
npm run demo:dev      # the showcase site
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/);
releases are cut by semantic-release from the commit messages.

---

## Licence

MIT © Ali Asadollahi
