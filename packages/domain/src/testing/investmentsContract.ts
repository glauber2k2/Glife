// Suíte de contrato de Investimentos (memória e SQLite local): ativos, movimentos, abertura, encerramento,
// cotação automática e desfazer.
import { describe, expect, it } from 'vitest';

import { isRepositoryError } from '../core/index.ts';
import { QTY_SCALE, assetPosition, type FinanceRepositories } from '../finance/index.ts';
import type { FinanceContractSubject } from './financeContract.ts';

const TODAY = '2026-11-25';
const Q = (units: number) => Math.round(units * QTY_SCALE);

async function expectCode(p: Promise<unknown>, code: string) {
  const error = await p.then(() => null, (e: unknown) => e);
  expect(isRepositoryError(error, code as never), `esperava erro ${code}, veio ${String(error)}`).toBe(true);
}

async function setup(make: () => Promise<FinanceContractSubject>) {
  const subject = await make();
  const f: FinanceRepositories = subject.finance;
  const cc = await f.accounts.create({ name: 'Itaú', kind: 'checking', initial_balance_cents: 500000 });
  const card = await f.accounts.create({ name: 'Nubank', kind: 'credit_card', closing_day: 3, due_day: 10, payment_account_id: cc.id });
  return { f, inv: f.investments, cc, card };
}

export function investmentsRepositoryContract(name: string, make: () => Promise<FinanceContractSubject>) {
  describe(`Investimentos (${name})`, () => {
    it('"Já tenho" num ativo manual grava aporte e cotação; excluir o ativo leva os movimentos e desfazer volta tudo', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'Tesouro Prefixado 2031', kind: 'treasury', institution: 'Nubank' }, { investedCents: 2_000_000, currentCents: 2_138_490, date: TODAY });
      let snap = await inv.snapshot();
      expect(snap.movements.map((m) => [m.kind, m.amount_cents])).toEqual([
        ['contribution', 2_000_000],
        ['quote', 2_138_490],
      ]);
      expect(assetPosition(a, snap.movements, TODAY).current).toBe(2_138_490);

      const ids = await inv.removeAsset(a.id);
      expect(ids).toHaveLength(2);
      snap = await inv.snapshot();
      expect(snap.assets).toEqual([]);
      expect(snap.movements).toEqual([]);
      await inv.restoreAsset(a.id, ids);
      snap = await inv.snapshot();
      expect(snap.assets.map((x) => x.id)).toEqual([a.id]);
      expect(snap.movements).toHaveLength(2);
    });

    it('ativo automático abre com aporte e quantidade; quantidade é obrigatória e cotação manual é recusada', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' }, { investedCents: 100_000, quantity: Q(100), date: TODAY });
      expect((await inv.snapshot()).movements.map((m) => m.quantity)).toEqual([Q(100)]);
      await expectCode(inv.addMovement({ asset_id: a.id, kind: 'contribution', amount_cents: 100, date: TODAY }), 'validation');
      await expectCode(inv.addMovement({ asset_id: a.id, kind: 'quote', amount_cents: 100, date: TODAY }), 'validation');
      await expectCode(inv.createAsset({ name: 'HGLG11', kind: 'reits', quote_symbol: 'HGLG11' }, { investedCents: 100, date: TODAY }), 'validation');
      expect((await inv.snapshot()).assets).toHaveLength(1);
    });

    it('ativo manual não aceita quantidade', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'CDB', kind: 'fixed_income' });
      await expectCode(inv.addMovement({ asset_id: a.id, kind: 'contribution', amount_cents: 100, quantity: Q(1), date: TODAY }), 'validation');
    });

    it('conta ligada precisa existir e não ser cartão', async () => {
      const { inv, cc, card } = await setup(make);
      const a = await inv.createAsset({ name: 'CDB', kind: 'fixed_income' });
      await expectCode(inv.addMovement({ asset_id: a.id, kind: 'contribution', amount_cents: 100, date: TODAY, account_id: card.id }), 'validation');
      const m = await inv.addMovement({ asset_id: a.id, kind: 'contribution', amount_cents: 100, date: TODAY, account_id: cc.id });
      expect(m.account_id).toBe(cc.id);
    });

    it('resgate não pode passar das cotas que existem', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'Bitcoin', kind: 'crypto', quote_symbol: 'bitcoin' }, { investedCents: 400_000, quantity: Q(0.01), date: TODAY });
      await expectCode(inv.addMovement({ asset_id: a.id, kind: 'withdrawal', amount_cents: 100, quantity: Q(0.02), date: TODAY }), 'validation');
      await inv.addMovement({ asset_id: a.id, kind: 'withdrawal', amount_cents: 100, quantity: Q(0.004), date: TODAY });
    });

    it('excluir o aporte que sustenta um resgate é recusado (cotas não ficam negativas)', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' });
      const ap = await inv.addMovement({ asset_id: a.id, kind: 'contribution', amount_cents: 1000, quantity: Q(10), date: TODAY });
      await inv.addMovement({ asset_id: a.id, kind: 'withdrawal', amount_cents: 1000, quantity: Q(10), date: TODAY });
      await expectCode(inv.removeMovement(ap.id), 'validation');
      expect((await inv.snapshot()).movements).toHaveLength(2);
    });

    it('movimento ligado a conta excluída ainda pode ser editado e restaurado', async () => {
      const { f, inv } = await setup(make);
      const inter = await f.accounts.create({ name: 'Inter', kind: 'checking' });
      const a = await inv.createAsset({ name: 'CDB', kind: 'fixed_income' });
      const m = await inv.addMovement({ asset_id: a.id, kind: 'contribution', amount_cents: 100, date: TODAY, account_id: inter.id });
      await f.accounts.remove(inter.id);
      expect((await inv.updateMovement(m.id, { notes: 'Nota nova' })).notes).toBe('Nota nova');
      await inv.removeMovement(m.id);
      await inv.restoreMovement(m.id);
      expect((await inv.snapshot()).movements.map((x) => x.id)).toEqual([m.id]);
    });

    it('resgate com data anterior ao aporte é recusado', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' });
      await inv.addMovement({ asset_id: a.id, kind: 'contribution', amount_cents: 1000, quantity: Q(10), date: '2026-11-20' });
      await expectCode(inv.addMovement({ asset_id: a.id, kind: 'withdrawal', amount_cents: 500, quantity: Q(5), date: '2026-11-10' }), 'validation');
    });

    it('editar movimento revalida as regras e excluir/restaurar funciona', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'LCI', kind: 'fixed_income' });
      const m = await inv.addMovement({ asset_id: a.id, kind: 'income', amount_cents: -12_000, date: TODAY, notes: 'Variação' });
      expect((await inv.updateMovement(m.id, { amount_cents: -10_000 })).amount_cents).toBe(-10_000);
      await expectCode(inv.updateMovement(m.id, { amount_cents: 0 }), 'validation');
      await inv.removeMovement(m.id);
      expect((await inv.snapshot()).movements).toEqual([]);
      await inv.restoreMovement(m.id);
      expect((await inv.snapshot()).movements.map((x) => x.id)).toEqual([m.id]);
    });

    it('encerrar resgata o valor atual (manual) ou todas as cotas pelo preço (automático)', async () => {
      const { inv } = await setup(make);
      const manual = await inv.createAsset({ name: 'Poupança', kind: 'savings' }, { investedCents: 500_000, currentCents: 561_220, date: TODAY });
      const r1 = await inv.close(manual.id, TODAY);
      expect([r1.kind, r1.amount_cents]).toEqual(['withdrawal', 561_220]);

      const auto = await inv.createAsset({ name: 'HGLG11', kind: 'reits', quote_symbol: 'HGLG11' }, { investedCents: 1_500_000, quantity: Q(100), date: TODAY });
      await expectCode(inv.close(auto.id, TODAY), 'validation'); // sem cotação ainda
      await inv.applyQuotes([{ source: 'brapi', symbol: 'HGLG11', priceE8: 160 * 1e8, name: 'HGLG11', quotedAt: '2026-11-25T13:00:00.000Z' }]);
      const r2 = await inv.close(auto.id, TODAY);
      expect([r2.kind, r2.amount_cents, r2.quantity]).toEqual(['withdrawal', 1_600_000, Q(100)]);
      const snap = await inv.snapshot();
      expect(snap.assets.every((x) => assetPosition(x, snap.movements, TODAY).closed)).toBe(true);
    });

    it('applyQuotes atualiza só o símbolo certo e ignora cotação mais velha', async () => {
      const { inv } = await setup(make);
      const itsa = await inv.createAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' });
      const btc = await inv.createAsset({ name: 'Bitcoin', kind: 'crypto', quote_symbol: 'bitcoin' });
      const n = await inv.applyQuotes([
        { source: 'brapi', symbol: 'ITSA4', priceE8: 1_023_000_000, name: 'Itaúsa', quotedAt: '2026-11-25T13:00:00.000Z' },
        { source: 'brapi', symbol: 'PETR4', priceE8: 1, name: 'Petrobras', quotedAt: '2026-11-25T13:00:00.000Z' },
      ]);
      expect(n).toBe(1);
      await inv.applyQuotes([{ source: 'brapi', symbol: 'ITSA4', priceE8: 900_000_000, name: 'Itaúsa', quotedAt: '2026-11-25T12:00:00.000Z' }]);
      const snap = await inv.snapshot();
      const byId = new Map(snap.assets.map((x) => [x.id, x]));
      expect(byId.get(itsa.id)!.last_price_e8).toBe(1_023_000_000);
      expect(byId.get(btc.id)!.last_price_e8).toBeNull();
    });

    it('troca de tipo respeita a fonte; trocar o código limpa o preço', async () => {
      const { inv } = await setup(make);
      const a = await inv.createAsset({ name: 'Itaúsa', kind: 'stocks', quote_symbol: 'ITSA4' }, { investedCents: 100, quantity: Q(1), date: TODAY });
      await inv.applyQuotes([{ source: 'brapi', symbol: 'ITSA4', priceE8: 1, name: 'x', quotedAt: '2026-11-25T13:00:00.000Z' }]);
      expect((await inv.updateAsset(a.id, { kind: 'reits' })).kind).toBe('reits');
      await expectCode(inv.updateAsset(a.id, { kind: 'crypto', quote_symbol: 'bitcoin' }), 'validation');
      const changed = await inv.updateAsset(a.id, { quote_symbol: 'ITSA3' });
      expect([changed.last_price_e8, changed.last_price_at]).toEqual([null, null]);
    });

    it('avisa quem observa a cada mudança', async () => {
      const { inv } = await setup(make);
      const seen: number[] = [];
      const stop = inv.watch((s) => seen.push(s.assets.length));
      await new Promise((r) => setTimeout(r, 20));
      await inv.createAsset({ name: 'CDB', kind: 'fixed_income' });
      await new Promise((r) => setTimeout(r, 50));
      stop();
      expect(seen[0]).toBe(0);
      expect(seen.at(-1)).toBe(1);
    });
  });
}
