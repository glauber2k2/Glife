-- Fase R2: orçamento zero = "sem orçamento a partir deste mês", preservando os meses anteriores.
-- O registro com valor 0 encerra o orçamento vigente sem apagar o histórico (a regra de leitura fica no app).

alter table public.budgets drop constraint budgets_amount_cents_check;
alter table public.budgets add constraint budgets_amount_cents_check check (amount_cents >= 0);
