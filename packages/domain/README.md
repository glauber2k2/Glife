# @vida/domain

Regras de negócio em TypeScript puro. **Não importa React, React Native nem Supabase.**
O mesmo código roda no app, nos testes e nas Edge Functions (Deno, via import map).

Uma pasta por feature, cada uma com `index.ts` como API pública:
`import { parseWikilinks } from '@vida/domain/links'`.
