// Verifies a Cloudflare Turnstile token, then stores a public form (booking request or review).
// The logic lives in handler.ts and validate.ts (unit tested); this file only wires in Deno.
// Deploy with: supabase functions deploy submit --no-verify-jwt
// Secrets: TURNSTILE_SECRET (required), TURNSTILE_EXPECTED_HOSTNAMES and ALLOWED_ORIGINS (optional).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHandler } from './handler.ts';
import { pickServiceKey } from './validate.ts';

let db: ReturnType<typeof createClient> | undefined;
const getDb = () => (db ??= createClient(
  Deno.env.get('SUPABASE_URL')!,
  pickServiceKey(Deno.env.get('SUPABASE_SECRET_KEYS'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),
));

Deno.serve(createHandler({
  env: (name) => Deno.env.get(name),
  fetch,
  insert: async (table, row) => (await getDb().from(table).insert(row)).error,
}));
