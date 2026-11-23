import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Mesmo alias do tsconfig (`@/` = src/) para testar código que usa imports absolutos.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
