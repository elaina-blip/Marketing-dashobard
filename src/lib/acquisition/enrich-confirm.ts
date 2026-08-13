/**
 * enrich-confirm.ts
 * -----------------------------------------------------------------------------
 * Confirm / reject, moved out of enrich-api.ts so the browser can import it.
 *
 * enrich-api.ts imports the Anthropic SDK at module scope, so importing anything
 * from it into a client component would ship the SDK to the browser. These two
 * functions are plain Supabase updates with no API dependency, and they are the
 * ONLY path from a suggestion to a confirmed mark — always driven by a click.
 * -----------------------------------------------------------------------------
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Promotes (or rejects) one platform suggestion. `accept` becomes the found flag. */
export async function confirmSuggestion(
  sb: SupabaseClient,
  id: string,
  platform: 'fb' | 'ig' | 'li',
  accept: boolean,
  who: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const patch: Record<string, unknown> = {
    [`${platform}_found`]: accept,
    [`${platform}_suggested`]: null,
    researched_by: who,
    researched_on: today,
  };
  const { error } = await sb.from('acquisition_companies').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Accepts every suggestion on a row at once. Still one deliberate click. */
export async function confirmAllOnRow(
  sb: SupabaseClient, id: string, who: string,
): Promise<void> {
  const { data, error } = await sb.from('acquisition_companies')
    .select('fb_suggested, ig_suggested, li_suggested').eq('id', id).single();
  if (error || !data) throw new Error(error?.message || 'Row not found.');

  const today = new Date().toISOString().slice(0, 10);
  const patch: Record<string, unknown> = { researched_by: who, researched_on: today };
  for (const p of ['fb', 'ig', 'li'] as const) {
    const s = (data as any)[`${p}_suggested`];
    // A platform with no suggestion is marked absent, not left unchecked: the
    // enrichment pass looked and found nothing, which is a real observation.
    patch[`${p}_found`] = !!s;
    patch[`${p}_suggested`] = null;
  }
  const { error: uErr } = await sb.from('acquisition_companies').update(patch).eq('id', id);
  if (uErr) throw new Error(uErr.message);
}
