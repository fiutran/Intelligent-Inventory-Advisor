/**
 * Wipe user inventory + decisions. Keeps product catalog so Decide still works.
 * Usage: npm run reset
 */
import { unlinkSync, existsSync } from 'node:fs';
import { openDatabase, DEFAULT_PATH } from '../src/server/db.ts';
import { clearUserData } from '../src/server/inventory.ts';

const path = process.env.DB_PATH ?? DEFAULT_PATH;

if (process.argv.includes('--hard')) {
  for (const f of [path, `${path}-wal`, `${path}-shm`]) {
    if (existsSync(f)) unlinkSync(f);
  }
  console.log(`\n  Deleted database at ${path}`);
  console.log('  Next start will create a fresh empty inventory.\n');
  process.exit(0);
}

const db = openDatabase(path);
clearUserData(db, 1);
db.close();
console.log('\n  Cleared inventory and decisions.');
console.log('  Product catalog kept. Refresh the app.\n');
