import type { CSSProperties } from 'react';

/**
 * Theme presets for the showcase. Each theme is just a bag of CSS variables the
 * picker reads — the same mechanism a consumer uses to theme it in their app.
 *
 * The values match the date picker's presets one for one, so the two packages
 * sit together in a single popover without either being re-themed.
 */

export type ThemeKey = 'light' | 'gold' | 'dark';

export interface Theme {
  label: string;
  vars: CSSProperties;
}

const FONT = "'Vazirmatn', sans-serif";

export const themes: Record<ThemeKey, Theme> = {
  light: {
    label: 'Light',
    vars: {
      ['--jtp-font' as string]: FONT,
    },
  },
  gold: {
    label: 'Gold',
    vars: {
      ['--jtp-font' as string]: FONT,
      ['--jtp-primary' as string]: '#e4ae21',
      ['--jtp-primary-fg' as string]: '#1c1917',
      ['--jtp-selected-bg' as string]: '#e4ae21',
      ['--jtp-selected-fg' as string]: '#1c1917',
      ['--jtp-face-bg' as string]: '#fbf3dc',
      ['--jtp-focus-ring' as string]: '#e4ae21',
    },
  },
  dark: {
    label: 'Dark',
    vars: {
      ['--jtp-font' as string]: FONT,
      ['--jtp-bg' as string]: '#1c1917',
      ['--jtp-fg' as string]: '#fafaf9',
      ['--jtp-muted-fg' as string]: '#a8a29e',
      ['--jtp-disabled-fg' as string]: '#57534e',
      ['--jtp-border' as string]: '#3f3b38',
      ['--jtp-hover-bg' as string]: '#292524',
      ['--jtp-primary' as string]: '#e4ae21',
      ['--jtp-primary-fg' as string]: '#1c1917',
      ['--jtp-selected-bg' as string]: '#e4ae21',
      ['--jtp-selected-fg' as string]: '#1c1917',
      ['--jtp-face-bg' as string]: '#292524',
      ['--jtp-focus-ring' as string]: '#e4ae21',
    },
  },
};

export const themeOptions = (Object.keys(themes) as ThemeKey[]).map(
  (value) => ({
    value,
    label: themes[value].label,
  }),
);
