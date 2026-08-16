import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * SCRATCH CONFIG — not part of the project, not committed.
 *
 * Runs `demo-real/` against the *real* `jalali-datepicker` source next door,
 * so the plugin integration can be seen for what it is rather than through the
 * stand-in host the shipped demo uses.
 *
 * Delete this file and `demo-real/` when you are done looking.
 */
const datepicker = resolve(__dirname, '../jalali-datepicker');
const here = __dirname;

export default defineConfig({
  root: 'demo-real',
  plugins: [react()],
  resolve: {
    alias: [
      // The date picker is not installed here — point the bare specifier at
      // its source. Vite compiles its CSS modules on the way through, so no
      // built stylesheet is needed either.
      {
        find: '@aliasadollahi/jalali-datepicker',
        replacement: resolve(datepicker, 'src/index.ts'),
      },
      // Both packages must share ONE React. Without this the date picker's
      // sources resolve react from their own node_modules, giving two copies
      // and the "invalid hook call" error the moment a hook runs.
      { find: /^react$/, replacement: resolve(here, 'node_modules/react') },
      {
        find: /^react-dom$/,
        replacement: resolve(here, 'node_modules/react-dom'),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: resolve(here, 'node_modules/react/jsx-runtime'),
      },
      {
        find: /^react-dom\/client$/,
        replacement: resolve(here, 'node_modules/react-dom/client'),
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5199,
    fs: {
      // Reading the sibling package's sources means stepping outside the root.
      allow: [here, datepicker],
    },
  },
});
