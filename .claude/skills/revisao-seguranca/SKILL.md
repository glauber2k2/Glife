---
name: revisao-seguranca
description: Checklist de segurança do Glife antes de cada release.
---

# Revisão de segurança

Marque cada item com evidência (comando/saída):

- [ ] `supabase/tests/rls_check.sql` retorna zero linhas no banco de produção.
- [ ] Toda tabela nova está no `sync-rules.yaml` filtrada por `bucket.user_id`.
- [ ] Cadastro público desligado (`enable_signup = false`) e MFA TOTP ativo.
- [ ] `grep -r "service_role\|sk-ant\|SECRET" apps/` não encontra segredos; só `EXPO_PUBLIC_*` no app.
- [ ] Buckets privados; URLs assinadas com validade de poucos minutos.
- [ ] Bloqueio do app: biometria + senha do app, `disableDeviceFallback: true`, tela oculta em recentes.
- [ ] Teto mensal de tokens da IA ativo na Edge Function.
- [ ] `pnpm audit` sem vulnerabilidades altas/críticas não tratadas.
- [ ] Backup noturno da última semana existe e um restore foi testado.
