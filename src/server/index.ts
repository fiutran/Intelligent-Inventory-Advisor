import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { DEFAULT_PATH, openDatabase } from './db.js';

const port = Number(process.env.PORT ?? 3001);
const db = openDatabase(process.env.DB_PATH ?? DEFAULT_PATH);
const app = createApp(db);

console.log(`API listening on http://localhost:${port}`);
console.log(`Database: ${process.env.DB_PATH ?? DEFAULT_PATH}`);

serve({ fetch: app.fetch, port });
