// Busca de ativo com sugestões enquanto digita (ações, FIIs e cripto): até 8 opções com o trecho destacado, preço
// e variação do dia. Setas, Enter e Esc no web; toque no celular. A lista fica logo abaixo do campo (a tela rola
// até o campo focado, então o teclado não cobre as opções).
import type { MarketItem, MarketType } from '@glife/domain/quotes';
import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View, type TextInputKeyPressEvent } from 'react-native';

import { Icon, Input, Text, makeStyles, useTheme } from '@/shared/ui';

import { useMoneyFormat } from '../hooks/useMoneyFormat';
import { useSymbolSearch } from '../hooks/useMarket';
import { pctSigned } from './investmentFormat';
import { highlightParts, moveActive } from './symbolSearch';

export function SymbolSearchField({ initialText = '', onPick, types, label = 'Buscar ativo (código, nome ou moeda)' }: { initialText?: string; onPick: (item: MarketItem) => void; types: readonly MarketType[]; label?: string }) {
  const s = useStyles();
  const t = useTheme();
  const { money } = useMoneyFormat();
  const [text, setText] = useState(initialText);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { items: all, status } = useSymbolSearch(open ? text : '');
  const items = all.filter((m) => types.length === 0 || types.includes(m.type));

  const pick = (m: MarketItem) => {
    setText(m.ticker);
    setOpen(false);
    onPick(m);
  };
  const onKey = (e: TextInputKeyPressEvent) => {
    const key = e.nativeEvent.key;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      (e as unknown as { preventDefault?: () => void }).preventDefault?.();
      setActive((i) => moveActive(i, items.length, key === 'ArrowDown' ? 'down' : 'up'));
    } else if (key === 'Escape') setOpen(false);
  };

  return (
    <View style={s.wrap}>
      <Input
        label={label}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setOpen(true);
          setActive(0);
        }}
        onKeyPress={onKey}
        onSubmitEditing={() => items[Math.max(0, active)] && pick(items[Math.max(0, active)]!)}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open && items.length > 0 }}
        trailing={
          text ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={t.touch.hitSlop}
              onPress={() => {
                setText('');
                setOpen(false);
              }}
            >
              <Icon icon={X} size={t.icon.small} color="textSecondary" />
            </Pressable>
          ) : (
            <Icon icon={Search} size={t.icon.small} color="textTertiary" />
          )
        }
      />
      {open && text.trim().length >= 2 && (
        <View style={s.list} accessibilityRole="list">
          {status === 'loading' && items.length === 0 ? (
            <Text variant="small" tone="tertiary" style={s.note}>
              Buscando…
            </Text>
          ) : status === 'offline' ? (
            <Text variant="small" tone="tertiary" style={s.note}>
              Sem conexão para buscar agora. Digite o código completo (ex.: PETR4) e tente de novo.
            </Text>
          ) : items.length === 0 ? (
            <Text variant="small" tone="tertiary" style={s.note}>
              {`Nada encontrado para "${text.trim()}". Confira o código (ex.: PETR4, HGLG11) ou o nome da moeda.`}
            </Text>
          ) : (
            items.map((m, i) => (
              <Pressable
                key={`${m.source}:${m.symbol}`}
                onPress={() => pick(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: i === active }}
                accessibilityLabel={`${m.ticker}, ${m.name}${m.priceE8 !== null ? `, ${money(Math.round(m.priceE8 / 1e6))}` : ''}`}
                style={({ pressed }) => [s.option, (i === active || pressed) && s.optionActive]}
              >
                <View style={s.grow}>
                  <Text variant="item" numberOfLines={1} style={s.strong}>
                    <Hl text={m.ticker} q={text} />
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    <Hl text={m.name} q={text} />
                  </Text>
                </View>
                <View style={s.right}>
                  {m.priceE8 !== null ? (
                    <Text variant="small" numeric style={s.strong}>
                      {money(Math.round(m.priceE8 / 1e6))}
                    </Text>
                  ) : null}
                  {m.changeDay !== null ? (
                    <Text variant="caption" numeric tone={m.changeDay < 0 ? 'danger' : 'success'}>
                      {pctSigned(m.changeDay / 100)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function Hl({ text, q }: { text: string; q: string }) {
  const s = useStyles();
  return (
    <>
      {highlightParts(text, q).map((p, i) =>
        p.hit ? (
          <Text key={i} tone="accent" style={s.strong}>
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: t.space[2] },
  grow: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  strong: { fontFamily: t.type.button.font },
  list: { backgroundColor: t.colors.card, borderRadius: t.radius.tile, padding: t.space[1.5], boxShadow: t.colors.shadow.level2 },
  note: { padding: t.space[3] },
  option: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.listRow, paddingVertical: t.space[2], paddingHorizontal: t.space[2.5], borderRadius: t.radius.segmentTrack },
  optionActive: { backgroundColor: t.colors.highlightSoft },
  right: { alignItems: 'flex-end', gap: t.space[0.5], flexShrink: 0 },
}));
