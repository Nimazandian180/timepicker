/**
 * Load the built bundles the way a consumer would — plain Node, no bundler.
 *
 * The demo and every downstream app go through a bundler, which is far more
 * forgiving than Node's own resolver. Node is not, so packaging breakage ships
 * silently unless something actually loads `dist/` outside a bundler. That is
 * this script.
 *
 * It checks both entry points in both module formats, because the `/plugin`
 * subpath is exactly the kind of thing that builds fine and then fails to
 * resolve in a real install.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const TIME = { hour: 22, minute: 30, second: 0 };
const EXPECTED = '۲۲:۳۰';

const failures = [];

function check(label, fn) {
  try {
    const got = fn();
    if (got !== EXPECTED) {
      failures.push(
        `${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(EXPECTED)}`,
      );
    } else {
      console.log(`  ok  ${label}`);
    }
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

function checkPlugin(label, plugin) {
  try {
    if (typeof plugin.timePlugin !== 'function') {
      failures.push(`${label}: timePlugin is not a function`);
      return;
    }
    const built = plugin.timePlugin({ format: '24h' });
    // The adapter must produce a plugin the date picker can consume: a name, a
    // renderer and a value extender. Shape is the whole contract, so shape is
    // what this asserts.
    const ok =
      typeof built.name === 'string' &&
      typeof built.render === 'function' &&
      typeof built.extendValue === 'function' &&
      built.extendValue({ year: 1404, month: 1, day: 1 }, TIME).hour === 22;
    if (!ok) {
      failures.push(`${label}: timePlugin() did not return a valid plugin`);
    } else {
      console.log(`  ok  ${label}`);
    }
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

const esm = await import(resolve(here, '../dist/index.js'));
check('esm  dist/index.js', () => esm.formatTime(TIME));

const cjs = require(resolve(here, '../dist/index.cjs'));
check('cjs  dist/index.cjs', () => cjs.formatTime(TIME));

const esmPlugin = await import(resolve(here, '../dist/plugin.js'));
checkPlugin('esm  dist/plugin.js', esmPlugin);

const cjsPlugin = require(resolve(here, '../dist/plugin.cjs'));
checkPlugin('cjs  dist/plugin.cjs', cjsPlugin);

if (failures.length) {
  console.error('\ndist failed to load as a plain Node package:');
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log('\ndist loads cleanly in both ESM and CJS.');
