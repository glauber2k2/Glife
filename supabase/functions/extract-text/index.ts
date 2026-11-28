// Composição da Edge Function `extract-text` (PDF → texto, com unpdf). SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// vêm do ambiente; o service_role só verifica o token. Publique com --import-map supabase/functions/deno.json.
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';

import { createExtractHandler } from './handler.ts';

const env = (name: string) => Deno.env.get(name)?.trim() || null;

const admin = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const verify = async (jwt: string) => {
  const { data, error } = await admin.auth.getClaims(jwt);
  return error || !data ? null : (data.claims as unknown as Record<string, unknown>);
};

Deno.serve(
  createExtractHandler({
    verify,
    extract: async (bytes) => {
      const pdf = await getDocumentProxy(bytes);
      const { totalPages, text } = await extractText(pdf, { mergePages: true });
      return { text, pages: totalPages };
    },
  }),
);
