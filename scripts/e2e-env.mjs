// Writes .env.e2e (gitignored) from the running local Supabase stack.
import process from 'node:process';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const status = Object.fromEntries(
  execSync('npx supabase status -o env', { encoding: 'utf8' })
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }),
);
const publishable = status.PUBLISHABLE_KEY || status.ANON_KEY;
const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
if (!status.API_URL || !publishable || !secret) throw new Error('Local Supabase is not running (npm run e2e:db)');

writeFileSync('.env.e2e', [
  `VITE_SUPABASE_URL=${status.API_URL}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
  // Cloudflare's public always-pass test site key.
  'VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA',
  // Not VITE_-prefixed, so it never reaches the browser bundle.
  `E2E_SERVICE_KEY=${secret}`,
  '',
].join('\n'));
process.stdout.write('wrote .env.e2e\n');
