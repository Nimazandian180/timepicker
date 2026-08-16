import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Anything that should NOT be bundled into the package output. React is a peer
// dependency; the date picker is an *optional* peer that this package never
// imports at runtime — the plugin entry mirrors its contract structurally
// instead — but it is listed anyway so that a future `import type` cannot
// accidentally become a real import in the bundle.
const external = [
  'react',
  'react-dom',
  /^react\//,
  '@aliasadollahi/jalali-datepicker',
  /^@aliasadollahi\/jalali-datepicker\//,
];

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep the original sources readable in the published bundle.
    minify: false,
    sourcemap: true,
    // Emit one stylesheet (consumers import 'jalali-timepicker/styles.css').
    cssCodeSplit: false,
    lib: {
      // Two entries, not one: `/plugin` is a separate specifier so a consumer
      // who never touches the date picker never pulls the adapter — or the
      // component tree behind it — into their bundle.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        plugin: resolve(__dirname, 'src/plugin/index.tsx'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, name) =>
        format === 'es' ? `${name}.js` : `${name}.cjs`,
      // -> dist/jalali-timepicker.css
      cssFileName: 'jalali-timepicker',
    },
    rollupOptions: {
      external,
    },
  },
});
