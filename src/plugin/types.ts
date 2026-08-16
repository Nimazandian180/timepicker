/**
 * A **structural mirror** of `@aliasadollahi/jalali-datepicker`'s plugin
 * contract.
 *
 * These declarations exist so this package can produce a valid date-picker
 * plugin without importing the date picker at all — not even for types. That
 * matters for three reasons:
 *
 *  1. **Installable alone.** Someone who wants only a time picker should not be
 *     made to install a calendar. The date picker is an *optional* peer
 *     dependency, and an optional peer that is genuinely absent must not break
 *     the build.
 *  2. **No dependency cycle.** The date picker must never depend on this
 *     package; this package never depends on it either. Neither direction
 *     exists, so no third "core" package is needed to break a cycle that was
 *     never formed.
 *  3. **Structural typing does the rest.** TypeScript matches interfaces by
 *     shape, so the object {@link timePlugin} returns satisfies the real
 *     `JalaliDatePickerPlugin` without either side knowing about the other.
 *
 * The cost is that the two definitions must be kept in step by hand. That is
 * paid for by `plugin-contract.test.ts`, which asserts the shapes still match
 * whenever the date picker is installed — so a drift fails CI rather than a
 * consumer's build.
 */
import type { ReactNode } from 'react';

/** Mirrors the date picker's `JalaliDate`. */
export interface JalaliDateLike {
  year: number;
  month: number;
  day: number;
}

/** Mirrors the date picker's `JalaliRange`. */
export interface JalaliRangeLike {
  start: JalaliDateLike;
  end: JalaliDateLike | null;
}

/** Mirrors the date picker's `PluginSlot`. */
export type DatePickerSlot = 'header' | 'panel' | 'footer';

/** Mirrors the date picker's `PluginLayout`. */
export type DatePickerLayout = 'inline' | 'tabs' | 'steps';

/** Mirrors the date picker's `PluginContext`. */
export interface DatePickerPluginContext<TState = unknown> {
  state: TState;
  setState: (next: TState | ((current: TState) => TState)) => void;
  selection: JalaliDateLike | JalaliRangeLike | null;
  selectionMode: 'single' | 'range';
  view: 'day' | 'month' | 'year';
  today: JalaliDateLike | null;
  mode: 'instant' | 'confirm';
  isEmpty: boolean;
  confirm: () => void;
  cancel: () => void;
  layout: DatePickerLayout;
  isActive: boolean;
  goNext: () => void;
  goBack: () => void;
}

/** Mirrors the date picker's `JalaliDatePickerPlugin`. */
export interface DatePickerPlugin<
  TState = unknown,
  TExtra extends object = object,
> {
  name: string;
  slot?: DatePickerSlot;
  /** Label for this plugin's tab or step under `'tabs'` / `'steps'`. */
  title?: string;
  initialState?: TState | (() => TState);
  render?(ctx: DatePickerPluginContext<TState>): ReactNode;
  extendValue?(value: JalaliDateLike | JalaliRangeLike, state: TState): TExtra;
}

/**
 * Mirrors the date picker's `AnyJalaliDatePickerPlugin`: a plugin whose state
 * type is not (and need not be) known to whoever holds it.
 *
 * A host only ever stores `TState` and hands it back, so erasing it is sound —
 * and necessary, since a list of plugins with differing state types has no
 * other common supertype. `TExtra` is kept, because it is what shapes the
 * host's callbacks.
 */
export type AnyDatePickerPlugin<TExtra extends object = object> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DatePickerPlugin<any, TExtra>;
