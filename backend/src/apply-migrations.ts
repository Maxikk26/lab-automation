import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function findMigrationsFile(): string {
  const candidates = [
    '/app/db-init/02-migrations.sql',
    resolve(__dirname, '..', 'db-init', '02-migrations.sql'),
    resolve(__dirname, '..', '..', 'db-init', '02-migrations.sql'),
  ];
  for (const p of candidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      // try next
    }
  }
  throw new Error(`02-migrations.sql not found. Tried: ${candidates.join(', ')}`);
}

export async function applyMigrations(): Promise<void> {
  try {
    const filePath = findMigrationsFile();
    const sql = readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log('[apply-migrations] Migrations applied successfully from', filePath);
  } catch (err) {
    console.error('[apply-migrations] Failed to apply migrations:', err);
  }
}
