// Planos de leitura (protótipo Bíblia v2): em andamento e concluídos, modelos prontos e criar um personalizado.
import { PLAN_TEMPLATES, chapterCount } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';
import { BookMarked, Plus, ScrollText, Sun } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { errorText } from '@/shared/lib/errorText';
import { BackHeader, Button, EmptyState, IconButton, ListGroup, NavRow, ProgressRing, Screen, Section, SegmentedControl, Tag, Text, makeStyles, useTheme, useToast } from '@/shared/ui';

import { paceLabel } from '../components/planMath';
import { usePlansMaybe } from '../hooks/BibleData';
import { usePlanViews, type PlanView } from '../hooks/usePlanStatuses';

const TEMPLATE_ICON = { ano: BookMarked, nt: ScrollText, ev30: Sun } as const;
const TEMPLATE_HUE = { ano: 350, nt: 205, ev30: 25 } as const;

export function PlansScreen() {
  const toast = useToast();
  const repo = usePlansMaybe()?.repo;
  const { views, today, loading } = usePlanViews();
  const [tab, setTab] = useState<'on' | 'done'>('on');
  const active = views.filter((v) => !v.done);
  const done = views.filter((v) => v.done);
  const restart = (v: PlanView) =>
    repo
      ?.restart(v.plan.id, today)
      .then((p) => {
        toast({ message: `“${p.name}” recomeçou hoje` });
        router.push(`/biblia/planos/${p.id}` as Href);
      })
      .catch((e: unknown) => toast({ message: `Não deu para recomeçar o plano: ${errorText(e)}` }));

  return (
    <Screen
      header={<BackHeader title="Planos de leitura" fallback="/biblia" backLabel="Bíblia" right={<IconButton icon={Plus} label="Novo plano" onPress={() => router.push('/biblia/planos/novo' as Href)} />} />}
    >
      <SegmentedControl
        label="Planos"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'on', label: `Em andamento ${active.length}` },
          { value: 'done', label: `Concluídos ${done.length}` },
        ]}
      />
      {tab === 'on' ? (
        active.length ? (
          <ListGroup>
            {active.map((v) => (
              <PlanRow key={v.plan.id} view={v} />
            ))}
          </ListGroup>
        ) : (
          !loading && <EmptyState compact message="Nenhum plano em andamento. Comece por um modelo ou crie o seu." />
        )
      ) : done.length ? (
        <ListGroup>
          {done.map((v) => (
            <PlanRow key={v.plan.id} view={v} trailing={<Button label="Refazer" size="sm" variant="secondary" selfAlign="center" onPress={() => void restart(v)} />} />
          ))}
        </ListGroup>
      ) : (
        !loading && <EmptyState compact message="Planos concluídos aparecem aqui." />
      )}

      <Section title="Modelos">
        <ListGroup>
          {PLAN_TEMPLATES.map((tpl) => {
            const ch = chapterCount(tpl.groups);
            return (
              <NavRow
                key={tpl.id}
                icon={TEMPLATE_ICON[tpl.id]}
                hue={TEMPLATE_HUE[tpl.id]}
                label={tpl.name}
                meta={`${tpl.days} dias · ${ch} capítulos · ${paceLabel(ch, tpl.days)}`}
                onPress={() => router.push(`/biblia/planos/novo?modelo=${tpl.id}` as Href)}
              />
            );
          })}
        </ListGroup>
      </Section>
      <Button label="Criar plano personalizado" icon={Plus} fullWidth onPress={() => router.push('/biblia/planos/novo' as Href)} />
    </Screen>
  );
}

function PlanRow({ view, trailing }: { view: PlanView; trailing?: ReactNode }) {
  const s = useStyles();
  const t = useTheme();
  const { plan, status } = view;
  const paused = status.paused;
  const cur = status.current;
  return (
    <Pressable style={s.row} onPress={() => router.push(`/biblia/planos/${plan.id}` as Href)} accessibilityRole="button" accessibilityLabel={plan.name}>
      <ProgressRing value={status.progress} size={t.size.ringSmall - t.space[2]} stroke={t.size.ringSmallStroke - t.space[0.5]}>
        <Text variant="tag" numeric>
          {Math.round(status.progress * 100)}%
        </Text>
      </ProgressRing>
      <View style={s.grow}>
        <Text variant="item" numberOfLines={1}>
          {plan.name}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {view.done ? `${plan.days} dias · concluído` : cur ? `Dia ${cur.n} de ${plan.days} · ${cur.label}` : `${plan.days} dias`}
        </Text>
      </View>
      {trailing ??
        (paused ? (
          <Tag label="Pausado" />
        ) : status.todayDone ? (
          <Tag label="Hoje" tone="success" />
        ) : cur ? (
          <Tag label={`${status.readToday.length}/${cur.refs.length}`} tone="tonal" />
        ) : null)}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], paddingVertical: t.space[3], minHeight: t.size.listRow },
  grow: { flex: 1, minWidth: t.space[0], gap: t.space[0.5] },
}));
