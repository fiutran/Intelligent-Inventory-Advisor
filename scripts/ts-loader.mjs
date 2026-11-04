/**
 * Lets `node --experimental-strip-types` run the TypeScript sources directly:
 * maps the `./foo.js` import specifiers used in src/ to the `./foo.ts` files on disk.
 * Registered by scripts/ts-register.mjs; used by `npm test`, so tests need no build step and no extra dependencies.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && specifier.endsWith('.js') && context.parentURL) {
    const ts = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(ts))) return next(ts.href, context);
  }
  return next(specifier, context);
}
