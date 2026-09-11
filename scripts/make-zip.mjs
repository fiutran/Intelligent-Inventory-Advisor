/**
 * Creates UpgradeSkip-portable.zip for sharing with teammates.
 * Excludes node_modules, data, dist, .git: they rebuild on first START.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const staging = join(root, '.pack-staging', 'UpgradeSkip');
const outZip = join(root, 'UpgradeSkip-portable.zip');

const skip = new Set([
  'node_modules',
  'data',
  'dist',
  '.git',
  '.pack-staging',
  'UpgradeSkip-portable.zip',
  'tsconfig.tsbuildinfo',
]);

function shouldCopy(name) {
  return !skip.has(name);
}

console.log('\n  Packing a shareable zip…\n');

rmSync(join(root, '.pack-staging'), { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

for (const name of [
  'START.bat',
  'start.sh',
  'START-HERE.md',
  'README.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.html',
  '.gitignore',
  'src',
  'scripts',
]) {
  const from = join(root, name);
  if (!existsSync(from)) continue;
  if (!shouldCopy(name) && name !== 'scripts') continue;
  cpSync(from, join(staging, name), { recursive: true });
}

writeFileSync(
  join(staging, 'OPEN-ME.txt'),
  [
    'UpgradeSkip: run on your own computer',
    '',
    '1. Read START-HERE.md',
    '2. Install Node.js LTS from https://nodejs.org (once)',
    '3. Windows: double-click START.bat',
    '   Mac: open Terminal, cd into this folder, run: chmod +x start.sh && ./start.sh',
    '',
    'Your browser should open to http://localhost:8787',
    'Leave the terminal window open while using the app.',
    '',
  ].join('\n'),
  'utf8',
);

rmSync(outZip, { force: true });

if (platform() === 'win32') {
  const ps = `
    Compress-Archive -Path '${staging.replace(/'/g, "''")}' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force
  `;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('  Zip failed. You can still zip the folder manually and include START-HERE.md + START.bat.');
    process.exit(1);
  }
} else {
  const r = spawnSync('zip', ['-r', outZip, 'UpgradeSkip'], {
    cwd: join(root, '.pack-staging'),
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.error('  Need `zip` installed, or zip the folder manually.');
    process.exit(1);
  }
}

rmSync(join(root, '.pack-staging'), { recursive: true, force: true });
console.log(`\n  Done → ${outZip}\n`);
console.log('  Send that file to a teammate. They unzip and follow START-HERE.md\n');
