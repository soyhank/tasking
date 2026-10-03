// Ejecuta un archivo .sql (o texto) contra el proyecto Supabase vía Management API.
// Uso: node scripts/sql.mjs archivo.sql   |   node scripts/sql.mjs -e "select 1"
import fs from 'node:fs';
const REF = process.env.SUPABASE_REF || 'pnqcfgbmrndvwcjqpkml';
const q = process.argv[2] === '-e' ? process.argv[3] : fs.readFileSync(process.argv[2], 'utf8');
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: q }),
});
const t = await r.text();
console.log(r.status, t.slice(0, 4000));
if (!r.ok) process.exit(1);
