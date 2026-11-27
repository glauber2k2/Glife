// Leitor dentro de um plano (?plano=<id>): faixa com o nome do plano no topo e, no fim do capítulo, "Marcar como lido".
// Marcar segue para o próximo capítulo não lido do dia (troca de tela, sem empilhar) ou, no último, volta com o aviso
// "Dia N concluído · X dias seguidos". Já lido: "Lido" e "Seguir para …".
import { dayLabel, planStatus, schedule } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';
import { ArrowRight, Check, ListChecks } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { Button, Mascot, Tag, Text, makeStyles, moduleColors, useTheme, useToast } from '@/shared/ui';

import { usePlansMaybe } from '../hooks/BibleData';
import type { PlanView } from '../hooks/usePlanStatuses';
import { planChapterHref } from './navigation';
import { nextUnread } from './planMath';

export function PlanStrip({ view, book, chapter, today }: { view: PlanView; book: string; chapter: number; today: string }) {
  const s = useStyles();
  const t = useTheme();
  const colors = moduleColors(view.plan.color_hue, t.scheme);
  const day = schedule(view.plan, today).find((d) => d.refs.includes(`${book}.${chapter}`));
  return (
    <View style={[s.strip, { backgroundColor: colors.soft }]}>
      <ListChecks size={t.icon.small} color={colors.strong} strokeWidth={t.icon.strokeWidth} />
      <Text variant="tag" numberOfLines={1} style={{ color: colors.strong }}>
        {view.plan.name}
        {day ? ` · dia ${day.n}` : ''}
      </Text>
    </View>
  );
}

export function PlanReaderCard({ view, book, chapter, today }: { view: PlanView; book: string; chapter: number; today: string }) {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const repo = usePlansMaybe()?.repo;
  const [busy, setBusy] = useState(false);
  const { plan } = view;
  const ref = `${book}.${chapter}`;
  const day = schedule(plan, today).find((d) => d.refs.includes(ref));
  if (!day) return null;
  const colors = moduleColors(plan.color_hue, t.scheme);
  const read = new Set(view.reads.map((r) => r.ref));
  const isRead = read.has(ref);
  const next = nextUnread(day.refs, read, ref);
  const pos = day.refs.indexOf(ref) + 1;
  const go = (to: string) => router.replace(planChapterHref(plan.id, to) as Href);

  const mark = async () => {
    if (!repo) return;
    setBusy(true);
    try {
      await repo.markRead(plan.id, [ref], today);
      if (next) {
        toast({ message: `${dayLabel([ref])} lido · ${pos} de ${day.refs.length}` });
        go(next);
        return;
      }
      const after = planStatus(plan, [...view.reads, { ref, read_on: today }], today);
      if (after.completed) await repo.complete(plan.id);
      toast({ message: after.completed ? `Plano “${plan.name}” concluído` : `Dia ${day.n} concluído · ${after.streak} ${after.streak === 1 ? 'dia seguido' : 'dias seguidos'}` });
      if (router.canGoBack()) router.back();
      else router.replace(`/biblia/planos/${plan.id}` as Href);
    } catch (e) {
      toast({ message: `Não deu para marcar a leitura: ${errorText(e)}` });
    } finally {
      setBusy(false);
    }
  };

  if (isRead)
    return (
      <View style={[s.card, { backgroundColor: t.colors.soft }]}>
        <View style={s.row}>
          <Tag label="Lido" tone="success" icon={Check} />
          <Text variant="small" tone="secondary" style={s.grow} numberOfLines={1}>
            {plan.name} · leitura {pos} de {day.refs.length}
          </Text>
        </View>
        {next && <Button label={`Seguir para ${dayLabel([next])}`} icon={ArrowRight} variant="secondary" size="compact" fullWidth onPress={() => go(next)} />}
      </View>
    );

  return (
    <View style={[s.card, { backgroundColor: colors.soft }]}>
      <View style={s.row}>
        <Mascot size={t.size.mascotSmall} color={colors.strong} eyes={colors.soft} />
        <View style={s.grow}>
          <Text variant="tag" style={{ color: colors.strong }} numberOfLines={1}>
            {plan.name} · dia {day.n}
          </Text>
          <Text variant="small">
            Leitura {pos} de {day.refs.length}
            {next ? ` · depois, ${dayLabel([next])}` : ''}
          </Text>
        </View>
      </View>
      <Button label={next ? 'Marcar como lido' : `Concluir o dia ${day.n}`} icon={Check} size="compact" fullWidth haptic loading={busy} disabled={busy || !repo} onPress={() => void mark()} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.space[1.5],
    height: t.size.pillSmall + t.space[1],
    paddingHorizontal: t.space[3],
    borderRadius: t.radius.full,
    maxWidth: '100%',
  },
  card: { borderRadius: t.radius.card, padding: t.space[4], gap: t.space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  grow: { flex: 1, minWidth: t.space[0], gap: t.space[0.5] },
}));
