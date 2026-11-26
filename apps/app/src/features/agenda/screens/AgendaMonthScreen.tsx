// Calendário do mês (protótipo "agenda-mes"): grade de semanas com até 3 pontos por dia (agenda, lembrete, dieta),
// o dia escolhido embaixo e "Novo no dia". A grade desliza ao trocar de mês e o destaque anda com mola.
import { agendaBetween, dayDots, monthGrid, shiftMonth, type AgendaItem, type DayDotModule, type DayOccurrence, type YearMonth } from '@glife/domain/agenda';
import { localNow, type IsoDate } from '@glife/domain/time';
import { router } from 'expo-router';
import { AlarmClock, CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { longDay } from '@/shared/lib/calendarInput';
import {
  BackHeader,
  Button,
  Card,
  Icon,
  IconButton,
  ListGroup,
  ListItem,
  Screen,
  Text,
  makeStyles,
  moduleColors,
  moduleHue,
  usePress,
  useReduceMotion,
  useTheme,
} from '@/shared/ui';

import { useAgenda } from '../hooks/AgendaData';
import { useExtraDayMarks } from '../hooks/DayMarks';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
/** Lembrete usa o matiz das anotações para se distinguir do evento (como no protótipo). */
const DOT_HUE: Record<DayDotModule, number> = { agenda: moduleHue.agenda, reminders: moduleHue.annotations, diet: moduleHue.diet };

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const monthName = (m: YearMonth) => capital(MONTHS[Number(m.slice(5, 7)) - 1]!);

export function AgendaMonthScreen() {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const { data } = useAgenda();
  const today = localNow().date;
  const [month, setMonth] = useState<YearMonth>(today.slice(0, 7));
  const [selected, setSelected] = useState<IsoDate>(today);
  const [gridWidth, setGridWidth] = useState(0);
  const direction = useRef(0);

  const cells = useMemo(() => monthGrid(month, 0), [month]);
  const first = cells[0]!.date;
  const last = cells[cells.length - 1]!.date;
  const items = useMemo(() => (data ? agendaBetween(data.events, data.reminders, first, last) : []), [data, first, last]);
  const extra = useExtraDayMarks(first, last);
  const occurrences = useMemo<DayOccurrence[]>(
    () => [...items.map((i) => ({ date: i.date, module: i.kind === 'event' ? ('agenda' as const) : ('reminders' as const) })), ...extra],
    [items, extra],
  );
  const dayItems = useMemo(() => items.filter((i) => i.date === selected), [items, selected]);

  const goTo = (next: YearMonth, dir: number) => {
    direction.current = dir;
    setMonth(next);
    setSelected(today.startsWith(next) ? today : `${next}-01`);
  };
  const goToday = () => {
    const current = today.slice(0, 7);
    if (month === current) setSelected(today);
    else goTo(current, month < current ? 1 : -1);
  };

  // Grade: desliza na direção da seta (com "reduzir movimento", só esmaece).
  const slide = useSharedValue(0);
  const fade = useSharedValue(1);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const duration = reduceMotion ? t.motion.tap : t.motion.standard;
    slide.set(reduceMotion ? 0 : direction.current * t.space[8]);
    fade.set(0);
    slide.set(withTiming(0, { duration }));
    fade.set(withTiming(1, { duration }));
  }, [month, reduceMotion, slide, fade, t]);
  const gridStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateX: slide.get() }] }));

  // Destaque do dia escolhido: um bloco único que anda até a célula com mola.
  const cellW = gridWidth / 7;
  const index = cells.findIndex((c) => c.date === selected && c.inMonth);
  const hx = useSharedValue(0);
  const hy = useSharedValue(0);
  const hv = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (!gridWidth) return;
    const x = (Math.max(index, 0) % 7) * cellW;
    const y = Math.floor(Math.max(index, 0) / 7) * t.size.monthCell;
    if (index < 0) {
      hv.set(withTiming(0, { duration: t.motion.tap }));
      return;
    }
    if (!placed.current || reduceMotion) {
      hx.set(x);
      hy.set(y);
      placed.current = true;
    } else {
      hx.set(withSpring(x, t.spring.standard));
      hy.set(withSpring(y, t.spring.standard));
    }
    hv.set(withTiming(1, { duration: t.motion.tap }));
  }, [index, cellW, gridWidth, reduceMotion, hx, hy, hv, t]);
  const highlightStyle = useAnimatedStyle(() => ({ opacity: hv.get(), transform: [{ translateX: hx.get() }, { translateY: hy.get() }] }));

  const open = (i: Pick<AgendaItem, 'kind' | 'id' | 'date'>) =>
    router.push({ pathname: i.kind === 'event' ? '/agenda/evento/[id]' : '/agenda/lembrete/[id]', params: { id: i.id, data: i.date } });
  const newOnDay = () => router.push({ pathname: '/agenda/evento/novo', params: { data: selected } });
  const onLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  return (
    <Screen
      header={
        <BackHeader
          title={`${monthName(month)} de ${month.slice(0, 4)}`}
          fallback="/agenda"
          right={<Button label="Hoje" variant="neutral" size="sm" selfAlign="center" onPress={goToday} />}
        />
      }
      footer={<Button label="Novo no dia" icon={Plus} onPress={newOnDay} />}
    >
      <Card padding="tight" gap={t.space[2]}>
        <View style={s.nav}>
          <IconButton icon={ChevronLeft} label="Mês anterior" variant="ghost" size={t.size.iconButtonSmall} onPress={() => goTo(shiftMonth(month, -1), -1)} />
          <Text variant="emphasis">{monthName(month)}</Text>
          <IconButton icon={ChevronRight} label="Próximo mês" variant="ghost" size={t.size.iconButtonSmall} onPress={() => goTo(shiftMonth(month, 1), 1)} />
        </View>
        <View style={s.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} variant="micro" tone="tertiary" align="center" style={s.head} accessibilityLabel={WEEKDAY_NAMES[i]}>
              {d}
            </Text>
          ))}
        </View>
        <Animated.View style={gridStyle} onLayout={onLayout}>
          <Animated.View pointerEvents="none" style={[s.highlight, { width: cellW, height: t.size.monthCell }, highlightStyle]}>
            <View style={s.highlightFill} />
          </Animated.View>
          {rows.map((row) => (
            <View key={row[0]!.date} style={s.weekRow}>
              {row.map((c) => (
                <DayCell
                  key={c.date}
                  date={c.date}
                  inMonth={c.inMonth}
                  selected={c.date === selected}
                  today={c.date === today}
                  dots={dayDots(c.date, occurrences)}
                  onPress={() => setSelected(c.date)}
                />
              ))}
            </View>
          ))}
        </Animated.View>
      </Card>

      <View style={s.section}>
        <Text variant="eyebrow" tone="tertiary">
          {capital(longDay(selected))}
        </Text>
        <Animated.View key={selected} entering={reduceMotion ? undefined : FadeIn.duration(t.motion.standard)}>
          {dayItems.length > 0 ? (
            <ListGroup>
              {dayItems.map((i) => (
                <ListItem
                  key={`${i.kind}:${i.id}:${i.date}`}
                  title={i.title}
                  subtitle={i.time ? `${i.time}${i.end_time ? `–${i.end_time}` : ''}` : 'Dia inteiro'}
                  icon={i.kind === 'event' ? CalendarDays : AlarmClock}
                  module={i.kind === 'event' ? 'agenda' : 'reminders'}
                  onPress={() => open(i)}
                />
              ))}
            </ListGroup>
          ) : (
            <Card>
              <View style={s.free}>
                <Icon icon={CalendarDays} size={t.icon.large} color="textTertiary" />
                <Text variant="small" tone="tertiary">
                  Dia livre.
                </Text>
              </View>
            </Card>
          )}
        </Animated.View>
      </View>
    </Screen>
  );
}

interface DayCellProps {
  date: IsoDate;
  inMonth: boolean;
  selected: boolean;
  today: boolean;
  dots: DayDotModule[];
  onPress: () => void;
}

function DayCell({ date, inMonth, selected, today, dots, onPress }: DayCellProps) {
  const s = useStyles();
  const t = useTheme();
  const press = usePress(!inMonth);
  return (
    <Pressable
      disabled={!inMonth}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !inMonth }}
      accessibilityLabel={`${longDay(date)}${dots.length ? `, ${dots.length} ${dots.length === 1 ? 'tipo de compromisso' : 'tipos de compromisso'}` : ''}`}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={s.cell}
    >
      <Animated.View style={[s.day, today && s.today, !inMonth && s.out, press.style]}>
        <Text variant="emphasis" tone={today ? 'accent' : 'primary'} numeric>
          {String(Number(date.slice(8, 10)))}
        </Text>
        <View style={s.dots}>
          {dots.map((k) => (
            <View key={k} style={[s.dot, { backgroundColor: moduleColors(DOT_HUE[k], t.scheme).chart }]} />
          ))}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row' },
  head: { flex: 1 },
  cell: { flex: 1, height: t.size.monthCell },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[0.5],
    margin: t.space[0.5],
    borderRadius: t.radius.field,
    borderWidth: t.size.radioBorder,
    borderColor: 'transparent',
  },
  today: { borderColor: t.colors.accent },
  out: { opacity: t.opacity.faint },
  highlight: { position: 'absolute', top: 0, left: 0, padding: t.space[0.5] },
  highlightFill: { flex: 1, borderRadius: t.radius.field, backgroundColor: t.colors.tonal },
  dots: { flexDirection: 'row', gap: t.space[0.5], height: t.size.dayDot },
  dot: { width: t.size.dayDot, height: t.size.dayDot, borderRadius: t.radius.full },
  section: { gap: t.space[3] },
  free: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[2], paddingVertical: t.space[2] },
}));
