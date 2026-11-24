---
name: release-android
description: Gerar uma nova versão Android (APK local) do Glife.
---

# Release Android

1. Rode a skill `revisao-seguranca`.
2. Se houver migrações novas: faça backup (`pg_dump`) e aplique com `npx supabase db push`.
3. Suba a versão em `apps/app/app.json` (`expo.version`) e anote o changelog em `docs/CHANGELOG.md`.
4. `pnpm typecheck && pnpm lint && pnpm test`.
5. `cd apps/app && npx expo prebuild --clean && npx expo run:android --variant release` (APK local, sem custo de EAS).
   **Neste Windows (sem `LongPathsEnabled`) o C++ estoura 260 caracteres a partir de `Desktop\Glauber\glife`.**
   Receita que funcionou em 23/11/2026:
   - Compile numa cópia curta: `git clone <repo> C:\gl`, copie `apps/app/.env.local`, `pnpm install --frozen-lockfile`
     (unidade `subst` não serve: o Node resolve o caminho real e o codegen recusa raízes diferentes).
   - `npx expo prebuild --platform android --no-install`; em `android/local.properties`
     `cmake.dir=...\\Android\\Sdk\\cmake\\3.31.6` (instale `cmake;3.31.6` pelo sdkmanager);
     em `android/app/build.gradle`, dentro de `android {`:
     `externalNativeBuild { cmake { buildStagingDirectory = file('C:/x') } }`.
   - `$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"; $env:NODE_ENV="production"` e, em `android/`,
     `.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a`.
   - Saída: `android/app/build/outputs/apk/release/app-release.apk` (~39 MB, assinada com a chave de depuração).
     Para mandar pelo chat (limite 30 MB), compacte em .zip (~17 MB).
6. Instale o APK no celular e faça um teste rápido: abrir, desbloquear, criar nota offline, sincronizar.
