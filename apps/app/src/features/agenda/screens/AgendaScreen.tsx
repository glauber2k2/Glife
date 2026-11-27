// Agenda (protótipo do redesign Cobalto): a semana numa faixa de dias, os lembretes do dia com check e os eventos
// numa linha do tempo com a marca de agora. "+" abre a escolha entre evento e lembrete.
import { agendaBetween, lateReminders, type AgendaItem } from '@glife/domain/agenda';
import { addDays, localNow, type IsoDate } from '@glife/domain/time';
import { router } from 'expo-router';
import { AlarmClock, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, MapPin, Plus, Repeat } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { longDay, weekdayShort } from '@/shared/lib/calendarInput';
import { errorText } from '@/shared/lib/errorText';
import {
  Button,
  Icon,
  IconButton,
  ListGroup,
  Mascot,
  NavRow,
  Screen,
  SectionHeader,
  Sheet,
  Text,
  makeStyles,
  moduleColors,
  moduleHue,
  usePress,
  useReduceMotion,
  useTheme,
  useToast,
} from '@/shared/ui';

import { sortRows, type Row } from '../components/rows';
import { TaskRow } from '../components/TaskRow';
import { weekStart } from '../components/week';
import { useAgenda } from '../hooks/AgendaData';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const weekdayOf = (iso: IsoDate) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AgendaScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const reduceMotion = useReduceMotion();
  const { repo, data } = useAgenda();
  const now = localNow();
  const [day, setDay] = useState<IsoDate>(now.date);
  const [creating, setCreating] = useState(false);
  const start = weekStart(day);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);

  const weekItems = useMemo(() => (data ? agendaBetween(data.events, data.reminders, week[0]!, week[6]!) : []), [data, week]);
  const busy = new Set(weekItems.map((i) => i.date));
  const items = weekItems.filter((i) => i.date === day);
  const isToday = day === now.date;
  const late: Row[] =
    data && isToday
      ? lateReminders(data.reminders, now)
          .filter(({ r }) => r.start_date !== now.date)
          .map(({ r, done }) => ({
            key: `late:${r.id}`,
            late: true,
            item: { kind: 'reminder', id: r.id, date: r.start_date, time: r.time, end_time: null, title: r.title, location: null, done },
          }))
      : [];
  const reminders: Row[] = sortRows([...late, ...items.filter((i) => i.kind === 'reminder').map((i) => ({ key: `${i.kind}:${i.id}:${i.date}:${i.time ?? ''}`, item: i }))]);
  const events = items.filter((i) => i.kind === 'event');
  const allDay = events.filter((e) => !e.time);
  const timed = events.filter((e) => e.time);
  const nowIndex = isToday ? timed.findIndex((e) => (e.time ?? '') > now.time) : -1;

  /** Marca ou desmarca o lembrete nesta data/horário; diz se gravou. */
  const toggle = async (id: string, date: string, time: string | undefined, done: boolean) => {
    try {
      await (done ? repo.completeReminder(id, date, time) : repo.uncompleteReminder(id, date, time));
      return true;
    } catch (e) {
      toast({ message: errorText(e) });
      return false;
    }
  };
  const open = (i: Pick<AgendaItem, 'kind' | 'id' | 'date'>) =>
    router.push({ pathname: i.kind === 'event' ? '/agenda/evento/[id]' : '/agenda/lembrete/[id]', params: { id: i.id, data: i.date } });
  const newEvent = () => router.push({ pathname: '/agenda/evento/novo', params: { data: day } });
  const newReminder = () => router.push({ pathname: '/agenda/lembrete/novo', params: { data: day } });
  const month = `${capital(MONTHS[Number(day.slice(5, 7)) - 1]!)} de ${day.slice(0, 4)}`;
  const enter = reduceMotion ? undefined : FadeIn.duration(t.motion.standard);

  return (
    <Screen
      eyebrow={month}
      title="Agenda"
      tabBar
      action={
        <View style={s.actions}>
          {!isToday && <Button label="Hoje" variant="neutral" size="sm" selfAlign="center" onPress={() => setDay(now.date)} />}
          <IconButton icon={CalendarDays} label="Calendário do mês" onPress={() => router.push('/agenda/mes')} />
          <IconButton icon={Plus} label="Novo" onPress={() => setCreating(true)} />
        </View>
      }
    >
      <View style={s.stripRow}>
        <IconButton icon={ChevronLeft} label="Semana anterior" variant="ghost" size={t.size.iconButtonSmall} onPress={() => setDay(addDays(day, -7))} />
        <View style={s.strip} accessibilityRole="tablist">
          {week.map((d) => (
            <DayCell key={d} date={d} selected={d === day} today={d === now.date} dot={busy.has(d)} onPress={() => setDay(d)} />
          ))}
        </View>
        <IconButton icon={ChevronRight} label="Próxima semana" variant="ghost" size={t.size.iconButtonSmall} onPress={() => setDay(addDays(day, 7))} />
      </View>

      {data && reminders.length === 0 && events.length === 0 ? (
        <Animated.View key={`free:${day}`} entering={enter} style={s.free}>
          <Mascot size={t.size.moduleIconLarge} mood="dormindo" float />
          <Text variant="heading" align="center">{`${capital(longDay(day).split(',')[0]!)} livre`}</Text>
          <Text variant="small" tone="tertiary" align="center" style={s.freeText}>
            {`Nada marcado para ${day.slice(8, 10)}/${day.slice(5, 7)}. Quer reservar um tempo para algo?`}
          </Text>
          <Button label="Novo evento" variant="secondary" size="compact" selfAlign="center" onPress={newEvent} />
        </Animated.View>
      ) : (
        <Animated.View key={day} entering={enter} style={s.day}>
          {reminders.length > 0 && (
            <View style={s.section}>
              <SectionHeader title="Lembretes" actionLabel="Novo" onAction={newReminder} />
              <ListGroup>
                {reminders.map((r) => (
                  <TaskRow key={r.key} row={r} onOpen={() => open(r.item)} onToggle={(done) => toggle(r.item.id, r.item.date, r.item.time ?? undefined, done)} />
                ))}
              </ListGroup>
            </View>
          )}
          {events.length > 0 && (
            <View style={s.section}>
              <SectionHeader title={capital(longDay(day).replace(/ de [a-zç]+$/, ''))} />
              {allDay.map((e) => (
                <EventCard key={`${e.id}:${e.date}`} item={e} onPress={() => open(e)} />
              ))}
              <View>
                {timed.map((e, i) => (
                  <View key={`${e.id}:${e.date}`}>
                    {i === nowIndex && <NowLine />}
                    <View style={s.tl}>
                      <Text variant="tag" tone="tertiary" numeric style={s.hour}>
                        {e.time}
                      </Text>
                      <View style={s.grow}>
                        <EventCard item={e} onPress={() => open(e)} />
                      </View>
                    </View>
                  </View>
                ))}
                {isToday && timed.length > 0 && nowIndex === -1 && <NowLine />}
              </View>
            </View>
          )}
        </Animated.View>
      )}

      <Sheet visible={creating} onClose={() => setCreating(false)} title="Criar">
        <ListGroup>
          <NavRow
            icon={CalendarPlus}
            iconSize="md"
            module="agenda"
            label="Evento"
            meta="Com início, fim, local e repetição"
            onPress={() => {
              setCreating(false);
              newEvent();
            }}
          />
          <NavRow
            icon={AlarmClock}
            iconSize="md"
            module="reminders"
            label="Lembrete"
            meta="Um aviso numa hora"
            onPress={() => {
              setCreating(false);
              newReminder();
            }}
          />
        </ListGroup>
      </Sheet>
    </Screen>
  );
}

function DayCell({ date, selected, today, dot, onPress }: { date: IsoDate; selected: boolean; today: boolean; dot: boolean; onPress: () => void }) {
  const s = useStyles();
  const press = usePress();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={longDay(date)}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={s.dayWrap}
    >
      <Animated.View style={[s.dayCell, selected && s.daySelected, press.style]}>
        <Text variant="micro" tone={selected ? 'primary' : 'tertiary'}>
          {weekdayShort(weekdayOf(date))}
        </Text>
        <Text variant="emphasis" tone={today ? 'accent' : 'primary'} numeric style={s.dayNumber}>
          {String(Number(date.slice(8, 10)))}
        </Text>
        <View style={[s.dot, !dot && s.dotHidden]} />
      </Animated.View>
    </Pressable>
  );
}

function EventCard({ item, onPress }: { item: AgendaItem; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const press = usePress();
  const colors = moduleColors(moduleHue.agenda, t.scheme);
  const meta = [
    item.time ? `${item.time}${item.end_time ? `–${item.end_time}` : ''}` : 'Dia inteiro',
    item.end_date !== item.date ? `até ${item.end_date.slice(8, 10)}/${item.end_date.slice(5, 7)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${meta}`} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[s.event, { backgroundColor: colors.soft }, press.style]}>
        {item.location ? (
          <View style={s.place}>
            <Icon icon={MapPin} size={t.icon.tiny - t.hairline} color="textSecondary" />
            <Text variant="tab" tone="secondary" numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        ) : null}
        {item.repeats && (
          <View style={s.repeat}>
            <Icon icon={Repeat} size={t.icon.tiny - t.hairline} color="textTertiary" />
            <Text variant="tab" tone="tertiary">
              Repete
            </Text>
          </View>
        )}
        <Text variant="item" style={s.eventTitle}>
          {item.title}
        </Text>
        <Text variant="caption" tone="secondary" numeric>
          {meta}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function NowLine() {
  const s = useStyles();
  return (
    <View style={s.now} accessibilityLabel="Agora">
      <View style={s.nowDot} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[0.5], marginHorizontal: -t.space[2] },
  strip: { flex: 1, flexDirection: 'row', gap: t.space[1] },
  dayWrap: { flex: 1 },
  dayCell: {
    height: t.size.dayHeight,
    borderRadius: t.radius.field,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[0.5],
  },
  daySelected: { backgroundColor: t.colors.card, boxShadow: t.colors.shadow.level1 },
  dayNumber: { fontSize: t.type.item.fontSize + t.space[0.5] },
  dot: { width: t.size.dayDot, height: t.size.dayDot, borderRadius: t.radius.full, backgroundColor: t.colors.textQuaternary },
  dotHidden: { opacity: t.opacity.hidden },
  free: {
    alignItems: 'center',
    gap: t.space[2.5],
    backgroundColor: t.colors.card,
    borderRadius: t.radius.card,
    paddingVertical: t.space[8],
    paddingHorizontal: t.space[5],
  },
  freeText: { maxWidth: t.layout.emptyTextMax - t.space[7] },
  day: { gap: t.layout.blockGap },
  section: { gap: t.space[3] },
  tl: { flexDirection: 'row', gap: t.space[3], alignItems: 'flex-start' },
  hour: { width: t.size.timelineHour, paddingTop: t.space[3.5] },
  grow: { flex: 1 },
  event: { borderRadius: t.radius.fieldLarge, paddingVertical: t.space[3], paddingHorizontal: t.space[3.5], marginVertical: t.space[1], gap: t.space[0.5] },
  eventTitle: { fontFamily: t.type.emphasis.font },
  place: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], marginBottom: t.space[1] },
  repeat: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
  now: {
    height: t.size.nowLine,
    marginVertical: t.space[1.5],
    marginLeft: t.size.timelineHour + t.space[3],
    borderRadius: t.size.nowLine,
    backgroundColor: t.colors.dangerStrong,
  },
  nowDot: {
    position: 'absolute',
    left: -t.size.nowDot / 2,
    top: -(t.size.nowDot - t.size.nowLine) / 2,
    width: t.size.nowDot,
    height: t.size.nowDot,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.dangerStrong,
  },
}));
