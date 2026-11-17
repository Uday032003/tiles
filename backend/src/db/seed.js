import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeed() {
  const seedFile = path.join(__dirname, 'migrations', '002_seed_defaults.sql');
  const sql = await fs.readFile(seedFile, 'utf8');
  await query(sql);
  console.log('Default room_types and work_types seeded successfully.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

