import { createServer } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { isLlmConfigured, readLlmConfig } from '../adapters/llm.js';
import { createApp } from './app.js';
import { DEFAULT_PATH, openDatabase } from './db.js';

/** Load .env from project root without a dependency. */
function loadEnvFile(): void {
  const path = join(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const preferredPort = Number(process.env.PORT ?? 8787);
const dbPath = process.env.DB_PATH ?? DEFAULT_PATH;
const distDir = process.env.STATIC_DIR ?? join(process.cwd(), 'dist');
const serveUi = process.env.SERVE_UI !== '0' && existsSync(join(distDir, 'index.html'));

function canBind(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function pickPort(start: number): Promise<number> {
  for (let p = start; p < start + 30; p++) {
    if (await canBind(p)) return p;
  }
  throw new Error(`No free port found from ${start}. Close other apps and try again.`);
}

const port = await pickPort(preferredPort);
if (port !== preferredPort) {
  console.log(`Port ${preferredPort} was busy, using ${port} instead`);
}

const db = openDatabase(dbPath);
const app = createApp(db, {
  corsOrigins: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ],
});

if (serveUi) {
  app.use('/*', serveStatic({ root: distDir }));
  app.get('*', serveStatic({ path: join(distDir, 'index.html') }));
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`UpgradeSkip running at http://localhost:${info.port}`);
  console.log(`Database: ${dbPath}`);
  if (serveUi) {
    console.log(`UI: served from ${distDir}`);
  } else {
    console.log('UI: not found (run npm run build, or use npm run launch / START.bat)');
  }
  if (isLlmConfigured()) {
    const cfg = readLlmConfig()!;
    console.log(`LLM: ${cfg.model} via ${cfg.baseUrl}`);
  } else {
    console.log('LLM: off (copy .env.example → .env and set LLM_API_KEY to enable)');
  }
});
