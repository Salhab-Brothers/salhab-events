// Restores a backup into the local Supabase stack (npm run e2e:db) the way a real recovery would,
// then checks the result through the same API the site uses.
// Usage: node scripts/restore-drill.mjs backup.sql
// The database container is named after project_id in supabase/config.toml.
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e');
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: publishable, E2E_SERVICE_KEY: secret } = process.env;
const dumpPath = process.argv[2];
if (!dumpPath || !url || !publishable || !secret) throw new Error('usage: node scripts/restore-drill.mjs backup.sql (with the local stack running)');

// The admin the drill re-creates; the same login as e2e/helpers.ts, so the browser check can sign in.
const DRILL_PASSWORD = 'e2e-Password-123';
const DRILL_EMAIL = '972501112233@admin.example.com';

const container = 'supabase_db_' + /project_id\s*=\s*"([^"]+)"/.exec(readFileSync('supabase/config.toml', 'utf8'))[1];
const psql = (input) => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'], { input, encoding: 'utf8' });

const dump = readFileSync(dumpPath, 'utf8');
const rowsIn = (table) => {
  const m = new RegExp(`^COPY public\\.${table} .*?\\n([\\s\\S]*?)^\\\\\\.$`, 'm').exec(dump);
  return m ? m[1].split('\n').filter(Boolean).length : 0;
};
const expected = { bookings: rowsIn('bookings'), booking_requests: rowsIn('booking_requests'), reviews: rowsIn('reviews') };

const problems = [];
const check = (ok, what) => { process.stdout.write(`${ok ? 'ok  ' : 'FAIL'} ${what}\n`); if (!ok) problems.push(what); };

// 1. The recovery steps from the README.
const restoreSql = execFileSync('scripts/prepare-restore.sh', [dumpPath], { encoding: 'utf8', maxBuffer: 1 << 28 });
psql('drop schema public cascade;');
psql(restoreSql);
const service = createClient(url, secret, { auth: { persistSession: false } });
const { data: users } = await service.auth.admin.listUsers();
for (const u of users.users.filter((x) => x.email === DRILL_EMAIL)) await service.auth.admin.deleteUser(u.id);
const { error: createError } = await service.auth.admin.createUser({ email: DRILL_EMAIL, password: DRILL_PASSWORD, email_confirm: true });
if (createError) throw createError;
psql(`insert into public.admins (user_id) select id from auth.users where email = '${DRILL_EMAIL}' on conflict do nothing;`);

// 2. The re-created admin can sign in. From here on the admin's own login is used, as the site does:
// the service role only has rights on the tables the submit function writes to.
const admin = createClient(url, publishable, { auth: { persistSession: false } });
const signIn = await admin.auth.signInWithPassword({ email: DRILL_EMAIL, password: DRILL_PASSWORD });
check(!signIn.error, 'the re-created admin can sign in');

// 3. Everything is back: the admin sees every row the backup held.
for (const [table, n] of Object.entries(expected)) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  check(!error && count === n, `${table}: the admin sees ${count} rows, backup holds ${n}${error ? ` (${error.message})` : ''}`);
}

// 4. The privacy rules came back with the data.
const anon = createClient(url, publishable, { auth: { persistSession: false } });
const publicRead = await anon.from('bookings').select('id,event_name,date');
check(!publicRead.error && publicRead.data.length === expected.bookings, 'visitors can read the public booking columns');
check((await anon.from('bookings').select('phone')).error !== null, 'visitors cannot read phone numbers');
check(((await anon.from('booking_requests').select('id')).data ?? []).length === 0, 'visitors cannot read booking requests');
check((await anon.from('reviews').insert({ reviewer_name: 'x', rating: 5 })).error !== null, 'visitors cannot write straight to the database');

writeFileSync('.restore-expected.json', JSON.stringify(expected));   // read by e2e/restore.spec.ts
process.stdout.write((problems.length ? `\n${problems.length} problem(s)` : '\nrestore drill passed') + '\n');
process.exit(problems.length ? 1 : 0);
