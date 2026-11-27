// "Leitura de hoje" no início da Bíblia: carrossel com encaixe dos planos em andamento (não pausados) e, no fim, o
// cartão de criar plano; pontos embaixo mostram onde se está. Sem planos, só o cartão de criar.
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { SectionHeader, makeStyles, useTheme } from '@/shared/ui';

import { usePlanViews } from '../hooks/usePlanStatuses';
import { NewPlanCard, PlanCard } from './PlanCard';

export function TodayPlans() {
  const s = useStyles();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { views, today, loading } = usePlanViews();
  const [page, setPage] = useState(0);
  const active = views.filter((v) => !v.done && !v.status.paused);
  const content = Math.min(width, t.layout.contentMaxWidth) - t.layout.gutter * 2;
  const cardWidth = active.length ? content - t.space[10] : content;
  const step = cardWidth + t.space[3];
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / step));
  if (loading) return null;

  return (
    <View style={s.root}>
      <SectionHeader title="Leitura de hoje" actionLabel={views.length ? `Planos (${views.length})` : undefined} onAction={() => router.push('/biblia/planos' as Href)} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={s.bleed}
        contentContainerStyle={s.row}
      >
        {active.map((v) => (
          <PlanCard key={v.plan.id} view={v} today={today} width={cardWidth} />
        ))}
        <NewPlanCard width={active.length ? content * 0.6 : content} />
      </ScrollView>
      {active.length > 0 && (
        <View style={s.dots} accessibilityElementsHidden>
          {[...active, null].map((v, i) => (
            <View key={v?.plan.id ?? 'novo'} style={[s.dot, i === page && s.dotOn]} />
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.space[3] },
  bleed: { marginHorizontal: -t.layout.gutter },
  row: { gap: t.space[3], paddingHorizontal: t.layout.gutter },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: t.space[1.5] },
  dot: { width: t.space[1.5], height: t.space[1.5], borderRadius: t.radius.full, backgroundColor: t.colors.border },
  dotOn: { width: t.space[4.5], backgroundColor: t.colors.textSecondary },
}));
