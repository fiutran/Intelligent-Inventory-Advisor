/**
 * Friendly launcher for non-developers.
 * Checks Node, installs deps, builds UI, starts server, opens browser.
 */
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const preferredPort = Number(process.env.PORT ?? 8787);

function say(msg) {
  console.log(`\n  ${msg}`);
}

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  console.error('  Need help? Open START-HERE.md in this folder.\n');
  process.exit(1);
}

function checkNode() {
  try {
    const v = execSync('node -v', { encoding: 'utf8' }).trim();
    const major = Number(v.replace(/^v/, '').split('.')[0]);
    if (Number.isNaN(major) || major < 20) {
      fail(
        `Node.js ${v} is too old. Install version 20 or newer from https://nodejs.org\n` +
          '     (Choose the LTS button, then restart your computer and try again.)',
      );
    }
    say(`Node.js ${v}: OK`);
  } catch {
    fail(
      'Node.js is not installed.\n' +
        '     1. Go to https://nodejs.org\n' +
        '     2. Download the LTS version and install it\n' +
        '     3. Restart your computer\n' +
        '     4. Double-click START.bat again',
    );
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: 'inherit',
      shell: platform() === 'win32',
      env: { ...process.env, ...opts.env },
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} failed (exit ${code})`));
    });
    child.on('error', reject);
  });
}

function canBind(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function pickPort(start) {
  for (let p = start; p < start + 30; p++) {
    if (await canBind(p)) return p;
  }
  fail(`Could not find a free port starting from ${start}. Close other apps and try again.`);
}

function openBrowser(url) {
  const os = platform();
  try {
    if (os === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    } else if (os === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
  } catch {
    // Browser open is optional
  }
}

async function waitForHealth(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function main() {
  console.log('\n══════════════════════════════════════');
  console.log('  UpgradeSkip: starting on this PC');
  console.log('══════════════════════════════════════');

  checkNode();

  if (!existsSync(join(root, 'node_modules'))) {
    say('First run: installing packages (a few minutes)…');
    try {
      await run('npm', ['install']);
    } catch {
      fail(
        'Install failed.\n' +
          '     Delete the node_modules folder, run npm install, then try again.\n' +
          '     Use Node.js 22 or newer (https://nodejs.org).',
      );
    }
  } else {
    say('Packages already installed: OK');
  }

  if (!existsSync(join(root, 'dist', 'index.html'))) {
    say('Building the app…');
    try {
      await run('npm', ['run', 'build']);
    } catch {
      fail('Build failed. If you changed nothing, try deleting the dist folder and run START again.');
    }
  } else {
    say('App already built: OK');
  }

  const port = await pickPort(preferredPort);
  if (port !== preferredPort) {
    say(`Port ${preferredPort} was busy, using ${port} instead`);
  }

  const url = `http://localhost:${port}`;
  say(`Starting… then your browser should open to ${url}`);
  say('Leave this window open while you use the app.');
  say('To stop: close this window or press Ctrl+C\n');

  const child = spawn('npx', ['tsx', 'src/server/index.ts'], {
    cwd: root,
    stdio: 'inherit',
    shell: platform() === 'win32',
    env: { ...process.env, PORT: String(port), SERVE_UI: '1' },
  });

  const ok = await waitForHealth(url);
  if (ok) {
    openBrowser(url);
    say(`Ready → ${url}\n`);
  } else {
    say('Server is starting slowly. Open this in your browser when ready:');
    say(url + '\n');
  }

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
