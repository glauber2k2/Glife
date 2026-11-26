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
import { SYMBOL_PATTERNS, type LookupItem } from '@glife/domain/quotes';
import { router, useLocalSearchParams } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader, Button, Chip, Icon, Input, Screen, Spinner, Switch, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { dm, todayIso } from '../components/format';
import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { parseQuantity, pctSigned } from '../components/investmentFormat';
import { MoneyField, SwitchRow } from '../components/ui';
import { useFinance } from '../hooks/FinanceData';
import { useInvestments } from '../hooks/useInvestments';

type LookupState = { status: 'idle' | 'loading' | 'none' | 'error' } | { status: 'found'; items: LookupItem[] };

export function AssetFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const snap = useInvestments();
  if (id && !snap) return <Screen>{null}</Screen>;
  const asset = id ? (snap?.assets.find((a) => a.id === id) ?? null) : null;
  const hasMovements = !!asset && !!snap?.movements.some((m) => m.asset_id === asset.id);
  return <AssetForm key={asset?.id ?? 'novo'} asset={asset} hasMovements={hasMovements} />;
}

function AssetForm({ asset, hasMovements }: { asset: InvestmentAsset | null; hasMovements: boolean }) {
  const { money, signed } = useMoneyFormat();
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const today = todayIso();
  const { repos, quotes } = useFinance();
  const [name, setName] = useState(asset?.name ?? '');
  const [kind, setKind] = useState<AssetKind | null>(asset?.kind ?? null);
  const [symbol, setSymbol] = useState(asset?.quote_symbol ?? '');
  const [symbolLabel, setSymbolLabel] = useState('');
  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  const [institution, setInstitution] = useState(asset?.institution ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const [already, setAlready] = useState(false);
  const [invested, setInvested] = useState<number | null>(null);
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [qtyText, setQtyText] = useState('');
  const [saving, setSaving] = useState(false);

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
      setLookup({ status: 'idle' });
    }
    setKind(k);
  };

  const runLookup = async (text: string) => {
    if (!source || !text.trim()) return;
    setLookup({ status: 'loading' });
    try {
      const items = await quotes.lookup(source, text.trim());
      setLookup(items.length ? { status: 'found', items } : { status: 'none' });
      if (source === 'brapi' && items[0]) {
        setSymbol(items[0].symbol);
        setSymbolLabel(`${items[0].name}${items[0].priceE8 !== null ? ` · ${money(Math.round(items[0].priceE8 / 1e6))}` : ''}`);
      }
    } catch (e) {
      console.warn('Falha ao conferir o código', e);
      setLookup({ status: 'error' });
    }
  };

  const save = async () => {
    if (!kind) return;
    setSaving(true);
    const fields = { name: name.trim(), kind, institution: institution.trim(), notes: notes.trim(), quote_symbol: source ? symbol : null };
    try {
      if (asset) {
        await repos.investments.updateAsset(asset.id, fields);
        if (router.canGoBack()) router.back();
        toast({ message: 'Ativo atualizado' });
      } else {
        const opening = already
          ? { investedCents: invested ?? 0, currentCents: source ? undefined : (currentValue ?? undefined), quantity: source ? (qty ?? undefined) : undefined, date: today }
          : undefined;
        const created = await repos.investments.createAsset(fields, opening);
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

        {source === 'brapi' && (
          <View style={s.group}>
            <Input
              label="Código na B3 (ex.: ITSA4, HGLG11)"
              value={symbol}
              onChangeText={(v) => {
                setSymbol(v.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setSymbolLabel('');
                setLookup({ status: 'idle' });
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="search"
              onSubmitEditing={() => void runLookup(symbol)}
              onBlur={() => void runLookup(symbol)}
              invalid={symbol !== '' && !symbolOk}
            />
            <LookupLine state={lookup} found={symbolLabel} notFound="Código não encontrado na B3. Confira e tente de novo." />
          </View>
        )}

        {source === 'coingecko' && (
          <View style={s.group}>
            <Input
              label="Buscar moeda (nome ou sigla)"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => void runLookup(query)}
              trailing={
                <Pressable accessibilityRole="button" accessibilityLabel="Buscar" onPress={() => void runLookup(query)} hitSlop={t.touch.hitSlop}>
                  <Icon icon={Search} size={t.icon.small} color="textSecondary" />
                </Pressable>
              }
            />
            {symbol ? (
              <Text variant="caption" tone="secondary">
                {`Escolhida: ${symbolLabel || symbol}`}
              </Text>
            ) : null}
            {lookup.status === 'found' ? (
              <View style={s.chips}>
                {lookup.items.map((c) => (
                  <Chip
                    key={c.symbol}
                    size="sm"
                    label={`${c.name} (${c.ticker})`}
                    selected={symbol === c.symbol}
                    onPress={() => {
                      setSymbol(c.symbol);
                      setSymbolLabel(`${c.name} (${c.ticker})`);
                    }}
                  />
                ))}
              </View>
            ) : (
              <LookupLine state={lookup} found="" notFound="Nenhuma moeda encontrada." />
            )}
          </View>
        )}

        <Input label="Instituição (opcional)" value={institution} onChangeText={setInstitution} maxLength={ASSET_INSTITUTION_MAX} />
        <Input label="Observação (opcional)" value={notes} onChangeText={setNotes} maxLength={ASSET_NOTES_MAX} multiline />

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

function LookupLine({ state, found, notFound }: { state: LookupState; found: string; notFound: string }) {
  const s = useStyles();
  if (state.status === 'loading') {
    return (
      <View style={s.lookup}>
        <Spinner />
        <Text variant="caption" tone="tertiary">
          Conferindo…
        </Text>
      </View>
    );
  }
  if (state.status === 'none') {
    return (
      <Text variant="caption" tone="warning">
        {notFound}
      </Text>
    );
  }
  if (state.status === 'error') {
    return (
      <Text variant="caption" tone="tertiary">
        Sem conexão para conferir agora. Dá para salvar e a cotação chega depois.
      </Text>
    );
  }
  return found ? (
    <Text variant="caption" tone="secondary" numeric>
      {found}
    </Text>
  ) : null;
}

const useStyles = makeStyles((t) => ({
  form: { gap: t.space[4], paddingTop: t.space[2] },
  group: { gap: t.space[2] },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -t.space[1] },
  kind: { width: '50%', padding: t.space[1] },
  disabled: { opacity: t.opacity.faint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  lookup: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
}));
