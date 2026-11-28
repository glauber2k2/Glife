// Onde e com que sessão falar com a Edge Function `ai-agent`. Só chaves públicas (EXPO_PUBLIC_*); o token é o da
// sessão atual (aal2), lido a cada pedido. No celular usa o fetch do Expo (suporta stream); no web, o do navegador.
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { getSupabase } from '@/shared/lib/supabase';

export function agentConnection() {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-agent`;
  const apikey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const getToken = async () => (await getSupabase().auth.getSession()).data.session?.access_token ?? null;
  const fetchFn = Platform.OS === 'web' ? undefined : (expoFetch as unknown as typeof fetch);
  return { url, apikey, getToken, fetch: fetchFn };
}
