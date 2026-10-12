// Exports every table in the ideas schema to one JSON file per table.
// Usage: node scripts/backup-supabase.mjs [outputDir]
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, IDEAS_DB_EMAIL and
// IDEAS_DB_PASSWORD in the environment. It signs in as the ideas owner
// user, because row level security only lets that user read these tables.
// Photos live in Google Drive, so this only covers database rows.

import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const email = process.env.IDEAS_DB_EMAIL;
const password = process.env.IDEAS_DB_PASSWORD;
const outDir = process.argv[2] || "backup";

if (!url || !key || !email || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, IDEAS_DB_EMAIL or IDEAS_DB_PASSWORD.");
  process.exit(1);
}

const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!loginRes.ok) {
  console.error(`Sign-in failed: HTTP ${loginRes.status}`);
  process.exit(1);
}
const { access_token } = await loginRes.json();

// Accept-Profile ideas schema instead of public.
const headers = { apikey: key, Authorization: `Bearer ${access_token}`, "Accept-Profile": "ideas" };

// Tables from supabase/migrations. Used if Supabase does not expose its table
// list, so the backup still works. Add new tables here when you create them.
const knownTables = ["entries", "steps"];

// The REST root describes every table, so new tables are picked up automatically.
let tables = knownTables;
try {
  const res = await fetch(`${url}/rest/v1/`, { headers });
  if (res.ok) {
    const spec = await res.json();
    const found = Object.keys(spec.definitions ?? spec.components?.schemas ?? {});
    if (found.length > 0) tables = [...new Set([...found, ...knownTables])];
  }
} catch {
  // fall back to the known list
}

await mkdir(outDir, { recursive: true });

const pageSize = 1000;
const summary = {};
for (const table of tables) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + pageSize - 1}` },
    });
    if (!res.ok) throw new Error(`Failed reading ${table}: HTTP ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  await writeFile(`${outDir}/${table}.json`, JSON.stringify(rows, null, 2));
  summary[table] = rows.length;
}

await writeFile(
  `${outDir}/_summary.json`,
  JSON.stringify({ exportedAt: new Date().toISOString(), rowCounts: summary }, null, 2)
);
console.log("Backed up tables:", summary);
