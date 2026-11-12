import { supabase } from '@/api/api';

export type PublicKind = 'request' | 'review';

/** Cloudflare Turnstile site key; when unset, public forms insert directly as before. */
export const captchaSiteKey = (): string | undefined =>
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || undefined;

/**
 * Sends a public form. With a captcha configured the row goes through the
 * `submit` function, which verifies the token before inserting; otherwise
 * `direct` inserts it straight into the database.
 */
export async function sendPublic<T>(
  kind: PublicKind,
  row: T,
  token: string | null,
  direct: (row: T) => Promise<unknown>,
): Promise<void> {
  if (!captchaSiteKey()) {
    await direct(row);
    return;
  }
  const { error } = await supabase.functions.invoke('submit', { body: { kind, row, token } });
  if (error) throw error;
}
