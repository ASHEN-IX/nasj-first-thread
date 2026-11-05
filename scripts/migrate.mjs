import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

async function main() {
  const file = process.argv[2] || 'db/002_alpha_onboarding.sql';
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const sql = neon(url);
  const raw = await readFile(file, 'utf8');

  // Strip line comments
  const lines = raw.split('\n').filter(l => !l.trim().startsWith('--'));
  const clean = lines.join('\n');

  // Split on semicolons that terminate statements
  const statements = clean
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const s of statements) {
    console.log('Running:', s.slice(0, 60).replace(/\s+/g, ' '));
    await sql.query(s);
  }
  console.log('Successfully applied:', file);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
