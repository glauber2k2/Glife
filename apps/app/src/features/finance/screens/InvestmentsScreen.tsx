// Investimentos, tela 1: patrimônio (valor atual somado), resultado, distribuição por tipo e os ativos agrupados por
// tipo; encerrados ficam recolhidos no fim. Ao abrir, pede as cotações vencidas (ações, FIIs e cripto).
import { ASSET_KIND_LABELS, isAutoQuoted, portfolio, quoteSourceOf, type PositionedAsset } from '@glife/domain/finance';
import { keyOf } from '@glife/domain/quotes';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BackHeader, EmptyState, IconButton, Reveal, Screen, Text, makeStyles } from '@/shared/ui';

import { balance, dm, dmy, money, signed, todayIso } from '../components/format';
import { pctSigned, shareText } from '../components/investmentFormat';
import { AssetRow, ClosedToggle, DistributionBar, GroupHeader, resultTone } from '../components/investmentRows';
import { useCountUp } from '../components/ui';
import { useInvestments, useRefreshQuotes } from '../hooks/useInvestments';

const openAsset = (id: string) => router.push({ pathname: '/financas/investimento/[id]', params: { id } });

function subOf({ asset, position }: PositionedAsset, closed: boolean, notFound: ReadonlySet<string>): string {
  const parts = [asset.institution];
  const source = quoteSourceOf(asset.kind);
  if (closed && position.lastDate) parts.push(`encerrado em ${dmy(position.lastDate)}`);
  else if (source && asset.quote_symbol && notFound.has(keyOf({ source, symbol: asset.quote_symbol }))) parts.push('código não encontrado');
  else if (isAutoQuoted(asset.kind) && !position.hasPrice) parts.push('sem cotação');
  return parts.filter(Boolean).join(' · ');
}

export function InvestmentsScreen() {
  const s = useStyles();
  const today = todayIso();
  const snap = useInvestments();
  const { notFound } = useRefreshQuotes(snap);
  const [closedOpen, setClosedOpen] = useState(false);
  const p = useMemo(() => (snap ? portfolio(snap.assets, snap.movements, today) : null), [snap, today]);
  const total = useCountUp(p?.total ?? 0);
  const newAsset = () => router.push('/financas/investimento/novo');

  return (
    <Screen>
      <View>
        <BackHeader title="Investimentos" fallback="/financas" />
        <View style={s.addAction}>
          <IconButton icon={Plus} label="Novo ativo" variant="outline" onPress={newAsset} />
        </View>
      </View>

      {p && snap && snap.assets.length === 0 ? (
        <EmptyState message="Nenhum investimento cadastrado. Cadastre um ativo e lance aportes e resgates." actionLabel="Novo ativo" onAction={newAsset} />
      ) : p ? (
        <Reveal>
          <View style={s.hero}>
            <Text variant="caption" tone="tertiary">
              Patrimônio investido
            </Text>
            <Text variant="display" numeric style={s.heroValue} accessibilityLabel={`Patrimônio investido ${money(p.total)}`}>
              {balance(total)}
            </Text>
            <View style={s.resultLine}>
              <Text tone={resultTone(p.result)} numeric style={s.medium}>
                {signed(p.result)}
              </Text>
              <Text tone={resultTone(p.result)} numeric style={s.medium}>
                {pctSigned(p.pct)}
              </Text>
              {p.updated && (
                <Text tone="tertiary" numeric>
                  {`Atualizado em ${dm(p.updated)}`}
                </Text>
              )}
            </View>
          </View>

          {p.groups.length > 0 && (
            <View style={s.block}>
              <DistributionBar groups={p.groups} />
            </View>
          )}

          <View>
            {p.groups.map((g) => (
              <View key={g.kind}>
                <GroupHeader label={ASSET_KIND_LABELS[g.kind]} right={shareText(g.share)} />
                <Reveal>
                  {g.assets.map((x) => (
                    <AssetRow
                      key={x.asset.id}
                      name={x.asset.name}
                      sub={subOf(x, false, notFound)}
                      value={money(x.position.current)}
                      pct={pctSigned(x.position.pct)}
                      pctTone={resultTone(x.position.result)}
                      onPress={() => openAsset(x.asset.id)}
                    />
                  ))}
                </Reveal>
              </View>
            ))}
            {p.closed.length > 0 && (
              <>
                <ClosedToggle count={p.closed.length} open={closedOpen} onPress={() => setClosedOpen((o) => !o)} />
                {closedOpen && (
                  <Reveal>
                    {p.closed.map((x) => (
                      <AssetRow
                        key={x.asset.id}
                        closed
                        name={x.asset.name}
                        sub={subOf(x, true, notFound)}
                        value={money(0)}
                        pct={signed(x.position.result)}
                        pctTone={resultTone(x.position.result)}
                        onPress={() => openAsset(x.asset.id)}
                      />
                    ))}
                  </Reveal>
                )}
              </>
            )}
            <View style={s.rule} />
          </View>
        </Reveal>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  addAction: { position: 'absolute', right: t.space[0], bottom: t.space[0] },
  medium: { fontFamily: t.type.chip.font },
  hero: { gap: t.space[2], paddingTop: t.space[2] },
  heroValue: { lineHeight: t.type.display.fontSize + t.space[1] },
  resultLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: t.space[2] + t.space[0.5], rowGap: t.space[1] },
  block: { marginTop: t.layout.blockGap, paddingTop: t.layout.blockGap, borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  rule: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
}));
