// Investimentos, tela 4: novo e editar ativo (protótipo 4a–4c). Tipos em chips, dois por linha. Ações e FIIs pedem
// o código da B3 (conferido na hora: nome e preço); cripto busca a moeda pelo nome ou sigla. "Já tenho este
// investimento" vira o primeiro movimento: aporte (e, nos manuais, uma cotação) com a data de hoje.
import {
  ASSET_INSTITUTION_MAX,
  ASSET_KINDS,
  ASSET_KIND_LABELS,
  ASSET_NAME_MAX,
  ASSET_NOTES_MAX,
  canChangeKind,
  quoteSourceOf,
  type AssetKind,
  type InvestmentAsset,
} from '@glife/domain/finance';
import { SYMBOL_PATTERNS, type MarketItem } from '@glife/domain/quotes';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LinkedNotesField, useLinkedNotes } from '@/features/links';
import { BackHeader, Button, Chip, Input, Screen, Switch, Text, makeStyles, useToast } from '@/shared/ui';

import { dm, todayIso } from '../components/format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { parseQuantity, pctSigned } from '../components/investmentFormat';
import { MoneyField, SwitchRow } from '../components/ui';
import { SymbolSearchField } from '../components/SymbolSearchField';
import { kindForMarketType, typedSymbol, typesForKind } from '../components/symbolSearch';
import { useFinance } from '../hooks/FinanceData';
import { useInvestments } from '../hooks/useInvestments';


export function AssetFormScreen() {
  const { id, symbol: presetSymbol, type: presetType, name: presetName } = useLocalSearchParams<{ id?: string; symbol?: string; type?: string; name?: string }>();
  const snap = useInvestments();
  if (id && !snap) return <Screen>{null}</Screen>;
  const asset = id ? (snap?.assets.find((a) => a.id === id) ?? null) : null;
  const hasMovements = !!asset && !!snap?.movements.some((m) => m.asset_id === asset.id);
  const preset =
    !asset && presetSymbol && (presetType === 'stock' || presetType === 'reit' || presetType === 'crypto')
      ? { symbol: presetSymbol, kind: kindForMarketType(presetType), name: presetName ?? '' }
      : null;
  return <AssetForm key={asset?.id ?? 'novo'} asset={asset} hasMovements={hasMovements} preset={preset} />;
}

function AssetForm({ asset, hasMovements, preset }: { asset: InvestmentAsset | null; hasMovements: boolean; preset: { symbol: string; kind: AssetKind; name: string } | null }) {
  const { money, signed } = useMoneyFormat();
  const s = useStyles();
  const toast = useToast();
  const today = todayIso();
  const { repos } = useFinance();
  const [name, setName] = useState(asset?.name ?? preset?.name ?? '');
  const [kind, setKind] = useState<AssetKind | null>(asset?.kind ?? preset?.kind ?? null);
  const [symbol, setSymbol] = useState(asset?.quote_symbol ?? preset?.symbol ?? '');
  const [symbolLabel, setSymbolLabel] = useState('');
  const [institution, setInstitution] = useState(asset?.institution ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const [already, setAlready] = useState(false);
  const [invested, setInvested] = useState<number | null>(null);
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [qtyText, setQtyText] = useState('');
  const [saving, setSaving] = useState(false);
  const linked = useLinkedNotes('asset', asset?.id);

  const source = kind ? quoteSourceOf(kind) : null;
  const symbolOk = source === null || SYMBOL_PATTERNS[source].test(symbol);
  const qty = parseQuantity(qtyText);
  const openingOk = !already || ((invested ?? 0) > 0 && (source === null || qty !== null));
  const ok = name.trim().length > 0 && kind !== null && symbolOk && openingOk && !saving;

  const pickKind = (k: AssetKind) => {
    if (asset && !canChangeKind(asset.kind, k, hasMovements)) return;
    if (quoteSourceOf(k) !== source) {
      setSymbol('');
      setSymbolLabel('');
    }
    setKind(k);
  };

  const pickSymbol = (m: MarketItem) => {
    setSymbol(m.symbol);
    setSymbolLabel(`${m.name}${m.priceE8 !== null ? ` · ${money(Math.round(m.priceE8 / 1e6))} hoje` : ''}`);
    if (!name.trim()) setName(m.name.slice(0, ASSET_NAME_MAX));
  };


  const save = async () => {
    if (!kind) return;
    setSaving(true);
    const fields = { name: name.trim(), kind, institution: institution.trim(), notes: notes.trim(), quote_symbol: source ? symbol : null };
    try {
      if (asset) {
        // Tudo ou nada: as notas vinculadas voltam se o ativo não grava.
        const undo = await linked.apply(asset.id);
        await repos.investments.updateAsset(asset.id, fields).catch(async (e: unknown) => {
          await undo().catch(() => undefined);
          throw e;
        });
        if (router.canGoBack()) router.back();
        toast({ message: 'Ativo atualizado' });
      } else {
        const opening = already
          ? { investedCents: invested ?? 0, currentCents: source ? undefined : (currentValue ?? undefined), quantity: source ? (qty ?? undefined) : undefined, date: today }
          : undefined;
        const created = await repos.investments.createAsset(fields, opening);
        await linked.apply(created.id).catch(async (e: unknown) => {
          await repos.investments.removeAsset(created.id).catch(() => undefined);
          throw e;
        });
        router.replace({ pathname: '/financas/investimento/[id]', params: { id: created.id } });
      }
    } catch (e) {
      console.warn('Falha ao salvar o ativo', e);
      toast({ message: 'Não foi possível salvar: confira o nome (até 120 caracteres), o código e os valores.' });
    } finally {
      setSaving(false);
    }
  };

  const jaHint = (() => {
    const inv = invested ?? 0;
    if (source !== null) return inv > 0 && qty !== null ? `Vira o primeiro aporte em ${dm(today)}. O valor de hoje vem da cotação.` : 'Vira o primeiro aporte, com data de hoje.';
    const cur = currentValue ?? 0;
    if (inv <= 0 && cur <= 0) return 'Vira o primeiro movimento, com data de hoje.';
    return `Vira o primeiro movimento em ${dm(today)}: aporte de ${money(inv)}${cur > 0 ? ` e cotação de ${money(cur)}. Resultado ${signed(cur - inv)} (${pctSigned(inv > 0 ? (cur - inv) / inv : 0)}).` : '.'}`;
  })();

  return (
    <Screen>
      <BackHeader title={asset ? 'Editar ativo' : 'Novo ativo'} fallback={asset ? { pathname: '/financas/investimento/[id]', params: { id: asset.id } } : '/financas/investimentos'} />
      <View style={s.form}>
        <Input label="Nome" value={name} onChangeText={setName} maxLength={ASSET_NAME_MAX} autoFocus={!asset} />

        <View style={s.group}>
          <Text variant="label" tone="tertiary">
            Tipo
          </Text>
          <View style={s.kinds}>
            {ASSET_KINDS.map((k) => {
              const allowed = !asset || canChangeKind(asset.kind, k, hasMovements);
              return (
                <View key={k} style={[s.kind, !allowed && s.disabled]}>
                  <Chip label={ASSET_KIND_LABELS[k]} selected={kind === k} onPress={() => pickKind(k)} />
                </View>
              );
            })}
          </View>
          {asset && hasMovements && (
            <Text variant="caption" tone="tertiary">
              Com movimentos, o tipo só troca entre os que têm a mesma forma de cotação.
            </Text>
          )}
        </View>

        {source !== null && kind !== null && (
          <View style={s.group}>
            <SymbolSearchField
              key={kind}
              initialText={symbol}
              types={typesForKind(kind)}
              label={kind === 'crypto' ? 'Buscar moeda (nome ou sigla)' : 'Buscar na B3 (código ou nome)'}
              onPick={pickSymbol}
              onType={(text) => {
                const code = source ? typedSymbol(text, source) : null;
                setSymbol(code ?? '');
                setSymbolLabel(code ? 'digitado; a cotação confere depois de salvar' : '');
              }}
            />
            {symbol ? (
              <Text variant="caption" tone="secondary" numeric>
                {`Escolhido: ${symbol}${symbolLabel ? ` · ${symbolLabel}` : ''}`}
              </Text>
            ) : null}
          </View>
        )}

        <Input label="Instituição (opcional)" value={institution} onChangeText={setInstitution} maxLength={ASSET_INSTITUTION_MAX} />
        <Input label="Observação (opcional)" value={notes} onChangeText={setNotes} maxLength={ASSET_NOTES_MAX} multiline />
        <LinkedNotesField state={linked} />

        {!asset && (
          <View style={s.group}>
            <SwitchRow
              title="Já tenho este investimento"
              sub="Lança o saldo de hoje como primeiro movimento."
              control={<Switch value={already} onChange={setAlready} label="Já tenho este investimento" />}
            />
            {already && (
              <View style={s.group}>
                {source !== null && (
                  <Input
                    label={kind === 'crypto' ? 'Quantidade' : 'Quantidade de cotas'}
                    value={qtyText}
                    onChangeText={setQtyText}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    invalid={qtyText.trim() !== '' && qty === null}
                  />
                )}
                <MoneyField label="Valor investido" cents={invested} onChange={setInvested} />
                {source === null && <MoneyField label="Valor atual (hoje)" cents={currentValue} onChange={setCurrentValue} />}
                <Text variant="caption" tone="tertiary" numeric>
                  {jaHint}
                </Text>
              </View>
            )}
          </View>
        )}

        <Button label={asset ? 'Salvar alterações' : 'Salvar ativo'} fullWidth haptic disabled={!ok} loading={saving} onPress={() => void save()} />
      </View>
    </Screen>
  );
}


const useStyles = makeStyles((t) => ({
  form: { gap: t.space[4], paddingTop: t.space[2] },
  group: { gap: t.space[2] },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -t.space[1] },
  kind: { width: '50%', padding: t.space[1] },
  disabled: { opacity: t.opacity.faint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
