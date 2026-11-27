// Cartão de um plano em "Leitura de hoje" (protótipo Bíblia v2): cor do plano, dia e progresso, sequência, o trecho do
// dia em destaque, os capítulos (lido em verde, próximo com contorno), a barra de progresso e "Ler agora"/"Continuar";
// dia concluído mostra o mascote feliz e o trecho de amanhã.
import { dayLabel, schedule } from '@glife/domain/bible';
import { router, type Href } from 'expo-router';
import { BookOpen, Check, ChevronRight, Flame } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button, Icon, Mascot, ModuleIcon, Text, makeStyles, moduleColors, useTheme } from '@/shared/ui';

import type { PlanView } from '../hooks/usePlanStatuses';
import { planChapterHref } from './navigation';
import { nextUnread, shortDate } from './planMath';

export function PlanCard({ view, today, width }: { view: PlanView; today: string; width: number }) {
  const s = useStyles();
  const t = useTheme();
  const { plan, status } = view;
  const colors = moduleColors(plan.color_hue, t.scheme);
  const cur = status.current;
  const read = new Set(view.reads.map((r) => r.ref));
  const next = cur ? nextUnread(cur.refs, read, '') : null;
  const tomorrow = cur ? schedule(plan, today).find((d) => d.n === cur.n + 1) : undefined;
  const pct = Math.round(status.progress * 100);
  const sameBook = cur ? new Set(cur.refs.map((r) => r.slice(0, r.lastIndexOf('.')))).size === 1 && cur.refs.length > 1 : false;

  return (
    <View style={[s.card, { width }]}>
      <Pressable style={s.top} onPress={() => router.push(`/biblia/planos/${plan.id}` as Href)} accessibilityRole="button" accessibilityLabel={`${plan.name}, dia ${cur?.n ?? plan.days} de ${plan.days}`}>
        <ModuleIcon icon={BookOpen} hue={plan.color_hue} size="sm" />
        <View style={s.grow}>
          <Text variant="micro" tone="tertiary" numeric>
            Dia {cur?.n ?? plan.days} de {plan.days} · {pct}%
          </Text>
          <Text variant="emphasis" numberOfLines={1}>
            {plan.name}
          </Text>
        </View>
        {status.streak > 0 && (
          <View style={s.inline}>
            <Icon icon={Flame} size={t.icon.small} color="warning" />
            <Text variant="tag" tone="warning" numeric>
              {status.streak}
            </Text>
          </View>
        )}
        <Icon icon={ChevronRight} size={t.icon.small} color="textQuaternary" />
      </Pressable>

      {cur && (
        <View style={s.today}>
          {cur.date > today && (
            <Text variant="caption" tone="tertiary">
              {shortDate(cur.date)}
            </Text>
          )}
          <Text variant="title2" numberOfLines={2}>
            {cur.label}
          </Text>
          <View style={s.chips}>
            {cur.refs.map((ref) => {
              const done = read.has(ref);
              const isNext = ref === next;
              const label = sameBook ? ref.slice(ref.lastIndexOf('.') + 1) : dayLabel([ref]);
              return (
                <Pressable
                  key={ref}
                  onPress={() => router.push(planChapterHref(plan.id, ref) as Href)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel([ref])}${done ? ', lido' : ''}`}
                  style={[s.chip, done && { backgroundColor: t.colors.successSoft }, isNext && s.chipNext]}
                >
                  {done && <Icon icon={Check} size={t.icon.tiny} color="success" />}
                  <Text variant="tag" tone={done ? 'success' : isNext ? 'accent' : 'secondary'} numeric>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={[s.bar, { backgroundColor: colors.soft }]}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: colors.strong }]} />
      </View>

      {status.todayDone ? (
        <View style={s.done}>
          <Mascot size={t.size.mascotSmall} color={t.colors.success} eyes={t.colors.successSoft} mood="feliz" />
          <Text variant="small" tone="success" style={s.grow}>
            Dia {cur?.n} concluído.{tomorrow ? ` Amanhã: ${tomorrow.label}` : ''}
          </Text>
        </View>
      ) : (
        next && (
          <Button
            label={`${status.readToday.length ? 'Continuar' : 'Ler agora'} · ${dayLabel([next])}`}
            icon={BookOpen}
            size="compact"
            fullWidth
            onPress={() => router.push(planChapterHref(plan.id, next) as Href)}
          />
        )
      )}
    </View>
  );
}

/** Último cartão do carrossel: criar outro plano. */
export function NewPlanCard({ width }: { width: number }) {
  const s = useStyles();
  return (
    <Pressable style={[s.newCard, { width }]} onPress={() => router.push('/biblia/planos/novo' as Href)} accessibilityRole="button" accessibilityLabel="Criar plano de leitura">
      <ModuleIcon icon={BookOpen} tone="tonal" size="sm" />
      <Text variant="emphasis">Criar plano</Text>
      <Text variant="small" tone="tertiary">
        Escolha livros, ritmo e lembrete.
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.card, borderRadius: t.radius.card, padding: t.space[4.5], gap: t.space[3.5] },
  top: { flexDirection: 'row', alignItems: 'center', gap: t.space[2.5] },
  grow: { flex: 1, minWidth: t.space[0], gap: t.space[0.5] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  today: { gap: t.space[2.5] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[1.5] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    minWidth: t.size.iconButton - t.space[0.5],
    height: t.size.pillSmall + t.space[1],
    paddingHorizontal: t.space[2.5],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.soft,
    justifyContent: 'center',
  },
  chipNext: { backgroundColor: t.colors.card, borderWidth: t.size.radioBorder, borderColor: t.colors.accentInk },
  bar: { height: t.size.trackThin + t.space[0.5], borderRadius: t.radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: t.radius.full },
  done: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], padding: t.space[3], borderRadius: t.radius.fieldLarge, backgroundColor: t.colors.successSoft },
  newCard: {
    borderRadius: t.radius.card,
    borderWidth: t.size.radioBorder,
    borderColor: t.colors.border,
    borderStyle: 'dashed',
    padding: t.space[4.5],
    gap: t.space[2],
    justifyContent: 'center',
  },
}));
