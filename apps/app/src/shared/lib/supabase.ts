// Único ponto que cria o cliente do Supabase. Só usa chaves públicas (EXPO_PUBLIC_*).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { createChunkedStorage } from './chunkedStorage';

// Acesso estático: o Expo só embute variáveis escritas literalmente.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/** Sessão no Android/iOS fica cifrada no SecureStore; no web, no localStorage padrão do Supabase. */
function nativeStorage() {
  return createChunkedStorage({
    getItem: (k) => SecureStore.getItemAsync(k),
    setItem: (k, v) => SecureStore.setItemAsync(k, v),
    removeItem: (k) => SecureStore.deleteItemAsync(k),
  });
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!url?.startsWith('https://') || !anonKey) {
    throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY em apps/app/.env.local.');
  }
  const isWeb = Platform.OS === 'web';
  client = createClient(url, anonKey, {
    auth: {
      storage: isWeb ? undefined : nativeStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  if (!isWeb) {
    // No celular, renova o token só com o app em primeiro plano.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client?.auth.startAutoRefresh();
      else void client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
