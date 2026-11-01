/**
 * Vercel serverless entry: wraps the same Hono app used locally.
 * Vercel's filesystem is read-only except /tmp, so the SQLite file lives there.
 * NOTE: /tmp is wiped whenever Vercel recycles the function, so saved inventory
 * on the hosted demo can reset. Local (Mac) installs keep data permanently.
 */
import { getRequestListener } from '@hono/node-server';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/db.js';

const db = openDatabase(process.env.DB_PATH ?? '/tmp/upgradeskip.db');
const app = createApp(db, { corsOrigins: [] });

export default getRequestListener(app.fetch);
