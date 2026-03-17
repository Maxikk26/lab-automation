import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function findViewsFile(): string {
  const candidates = [
    '/app/db-views/views.sql',
    resolve(__dirname, '..', 'db-views', 'views.sql'),
    resolve(__dirname, '..', '..', 'db-views', 'views.sql'),
  ];
  for (const p of candidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      // try next
    }
  }
  throw new Error(`views.sql not found. Tried: ${candidates.join(', ')}`);
}

export async function applyViews(): Promise<void> {
  try {
    const filePath = findViewsFile();
    const sql = readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log('[apply-views] Views applied successfully from', filePath);
  } catch (err) {
    console.error('[apply-views] Failed to apply views:', err);
  }
}
