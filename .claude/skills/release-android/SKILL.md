---
name: release-android
description: Gerar uma nova versão Android (APK local) do Vida.
---

# Release Android

1. Rode a skill `revisao-seguranca`.
2. Se houver migrações novas: faça backup (`pg_dump`) e aplique com `npx supabase db push`.
3. Suba a versão em `apps/app/app.json` (`expo.version`) e anote o changelog em `docs/CHANGELOG.md`.
4. `pnpm typecheck && pnpm lint && pnpm test`.
5. `cd apps/app && npx expo prebuild --clean && npx expo run:android --variant release` (APK local, sem custo de EAS).
6. Instale o APK no celular e faça um teste rápido: abrir, desbloquear, criar nota offline, sincronizar.
