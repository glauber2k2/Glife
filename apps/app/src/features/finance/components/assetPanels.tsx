// Abas do detalhe do ativo: Estatísticas (blocos que explicam ao tocar) e IA (leitura dos números com perguntas
// prontas e "Salvar como nota vinculada"). Notas vinculadas gravam na hora (a tela não tem botão Salvar).
import { ASSET_QUESTIONS, STATS_MIN_POINTS, type AssetQuestion, type AssetStats, type InsightBlock } from '@glife/domain/finance';
import { Info, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useNoteLinker, type LinkedNotes } from '@/features/links';
import { errorText } from '@/shared/lib/errorText';
import { askGlifeAi } from '@/shared/navigation/askGlifeAi';
import { Button, Chip, EmptyState, Icon, Text, makeStyles, useTheme, useToast, type TextTone } from '@/shared/ui';

import { dm } from './format';
import { InsightBlocks } from './InsightBlocks';
import { assetQuestionPrompt, insightNote } from './assetDetail';
import { pctSigned, shareText } from './investmentFormat';

const OSC = { low: 'Baixa', medium: 'Média', high: 'Alta' } as const;

interface Tile {
  key: string;
  label: string;
  value: string;
  sub: string;
  tone?: TextTone;
  explain: string;
}

export function AssetStatsGrid({ stats, money, auto }: { stats: AssetStats; money: (c: number) => string; auto: boolean }) {
  const s = useStyles();
  const w = stats.window;
  const tiles: Tile[] = [];
  if (w && stats.periodReturn !== null)
    tiles.push({ key: 'ret', label: `Variação em ${w.days} pregões`, value: pctSigned(stats.periodReturn), sub: `${dm(w.from)} a ${dm(w.to)}`, tone: stats.periodReturn < 0 ? 'danger' : 'success', explain: 'Quanto o preço mudou do primeiro ao último dia da janela de dados que o app tem.' });
  if (w && stats.oscillation && stats.volatility !== null)
    tiles.push({ key: 'osc', label: 'Oscilação', value: OSC[stats.oscillation], sub: `${shareText(stats.volatility)} ao ano`, explain: 'Quanto o preço costuma subir e descer num ano, calculado pelos dias da janela. Quanto maior, maiores os sustos no caminho.' });
  if (w && stats.maxDrawdown !== null)
    tiles.push({ key: 'dd', label: 'Maior queda', value: stats.maxDrawdown < 0 ? `−${shareText(-stats.maxDrawdown)}` : '0%', sub: 'do topo ao fundo na janela', tone: stats.maxDrawdown <= -0.2 ? 'danger' : undefined, explain: 'A maior perda de quem comprou no ponto mais alto da janela e vendeu no mais baixo.' });
  if (auto && stats.vsAverage !== null)
    tiles.push({ key: 'avg', label: 'Preço vs seu preço médio', value: pctSigned(stats.vsAverage), sub: stats.vsAverage < 0 ? 'abaixo do que você pagou' : 'acima do que você pagou', tone: stats.vsAverage < 0 ? 'danger' : 'success', explain: stats.vsAverage < 0 ? 'O preço de hoje está abaixo do que você pagou em média. Um aporte agora baixaria seu preço médio.' : 'O preço de hoje está acima do que você pagou em média.' });
  tiles.push({ key: 'inc', label: 'Rendimentos em 12 meses', value: money(stats.income12m), sub: stats.yieldOnCost !== null && stats.income12m > 0 ? `${shareText(stats.yieldOnCost)} do que você investiu` : 'dividendos e juros lançados', explain: 'Soma dos rendimentos que você lançou neste ativo nos últimos 12 meses.' });

  return (
    <View style={s.gap12}>
      {!w && <EmptyState compact message={`Ainda sem dados suficientes: as estatísticas de mercado aparecem com ${STATS_MIN_POINTS} pregões de histórico.`} />}
      <View style={s.grid}>
        {tiles.map((x, i) => (
          <View key={x.key} style={[s.cell, tiles.length % 2 === 1 && i === tiles.length - 1 && s.wide]}>
            <StatTile tile={x} />
          </View>
        ))}
      </View>
      {w && (
        <Text variant="caption" tone="tertiary">
          {`Com base em ${w.days} pregões de histórico. Toque num número para ver o que ele quer dizer.`}
        </Text>
      )}
    </View>
  );
}

function StatTile({ tile }: { tile: Tile }) {
  const s = useStyles();
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={s.tile} onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityHint="Mostra o que o número quer dizer">
      <View style={s.tileHead}>
        <Text variant="caption" tone="tertiary" style={s.grow}>
          {tile.label}
        </Text>
        <Icon icon={Info} size={t.icon.tiny} color="textTertiary" />
      </View>
      <Text variant="title2" numeric tone={tile.tone ?? 'primary'}>
        {tile.value}
      </Text>
      <Text variant="caption" tone="secondary">
        {tile.sub}
      </Text>
      {open && (
        <Text variant="caption" tone="secondary" style={s.explain}>
          {tile.explain}
        </Text>
      )}
    </Pressable>
  );
}

export function AssetInsightPanel({ assetName, answer, linked, today }: { assetName: string; answer: (q: AssetQuestion) => InsightBlock[]; linked: LinkedNotes; today: string }) {
  const s = useStyles();
  const toast = useToast();
  const port = useNoteLinker();
  const [q, setQ] = useState<AssetQuestion | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const label = ASSET_QUESTIONS.find(([k]) => k === q)?.[1] ?? '';
  const blocks = q ? answer(q) : [];
  const save = async () => {
    if (!port || !q) return;
    setSaving(true);
    try {
      const { title, body } = insightNote(assetName, label, blocks, today.split('-').reverse().join('/'));
      const note = await port.create(title, body);
      linked.add(note);
      setSaved(q);
      toast({ message: 'Leitura salva em Notas e vinculada' });
    } catch (e) {
      toast({ message: `Nota não criada: ${errorText(e)}` });
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={s.gap12}>
      <View style={s.ai}>
        <Text variant="small" tone="tonal" style={s.strong}>
          {`Leitura dos números de ${assetName}`}
        </Text>
        <View style={s.chips}>
          {ASSET_QUESTIONS.map(([k, l]) => (
            <Chip key={k} label={l} size="sm" selected={q === k} onPress={() => setQ(k)} />
          ))}
        </View>
      </View>
      {q ? (
        <View key={q}>
          <InsightBlocks blocks={blocks} />
          <View style={s.actions}>
            {port && saved !== q && <Button label="Salvar como nota vinculada" variant="secondary" size="sm" loading={saving} onPress={() => void save()} />}
            <Button label="Perguntar à Glife IA" icon={Sparkles} variant="ghost" size="sm" onPress={() => askGlifeAi(assetQuestionPrompt(assetName, label, blocks, today))} />
          </View>
        </View>
      ) : (
        <Text variant="small" tone="tertiary">
          Escolha uma pergunta: a resposta usa os seus números e o histórico do ativo. Não é recomendação de compra ou venda.
        </Text>
      )}
    </View>
  );
}

/** Notas vinculadas sem botão Salvar: cada mudança na lista grava na hora (a primeira leitura vira a base). */
export function useApplyLinkedNow(linked: LinkedNotes, sourceId: string) {
  const toast = useToast();
  const base = useRef<string | null>(null);
  useEffect(() => {
    if (!linked.ready) return;
    const key = linked.notes
      .map((n) => n.id)
      .sort()
      .join(',');
    if (base.current === null) {
      base.current = key;
      return;
    }
    if (key === base.current) return;
    base.current = key;
    void linked.apply(sourceId).catch((e) => toast({ message: `Vínculo não salvo: ${errorText(e)}` }));
  }, [linked, sourceId, toast]);
}

const useStyles = makeStyles((t) => ({
  gap12: { gap: t.space[3] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[2], marginTop: t.space[3] },
  grow: { flex: 1, minWidth: 0 },
  strong: { fontFamily: t.type.button.font },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -t.space[1] },
  cell: { width: '50%', padding: t.space[1] },
  wide: { width: '100%' },
  tile: { backgroundColor: t.colors.card, borderRadius: t.radius.tile, padding: t.space[3.5], gap: t.space[1.5], minHeight: t.size.listRow },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  explain: { marginTop: t.space[1] },
  ai: { backgroundColor: t.colors.tonal, borderRadius: t.radius.card, padding: t.space[4], gap: t.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
}));
