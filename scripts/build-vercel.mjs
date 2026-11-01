/**
 * Builds UpgradeSkip for Vercel using the Build Output API (v3).
 * Output: .vercel/output/{static, functions/api.func, config.json}
 */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const out = join(root, '.vercel', 'output');
const fn = join(out, 'functions', 'api.func');

rmSync(out, { recursive: true, force: true });

console.log('› Building UI (vite)…');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

console.log('› Copying static files…');
cpSync(join(root, 'dist'), join(out, 'static'), { recursive: true });

console.log('› Bundling API function…');
mkdirSync(fn, { recursive: true });
await build({
  entryPoints: [join(root, 'src', 'vercel', 'handler.ts')],
  outfile: join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['node:*'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'warning',
});
// db.ts reads the schema next to itself at runtime
cpSync(join(root, 'src', 'server', 'schema.sqlite.sql'), join(fn, 'schema.sqlite.sql'));
writeFileSync(
  join(fn, '.vc-config.json'),
  JSON.stringify(
    { runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 60 },
    null,
    2,
  ),
);

writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '^/api(?:/.*)?$', dest: '/api' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('✓ Vercel build ready in .vercel/output');
