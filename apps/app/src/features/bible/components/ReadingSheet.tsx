// Folha "Leitura" (Aa): tamanho do texto, espaço entre linhas, espaço entre letras e números dos versículos. O véu é
// claro para o texto atrás mudar ao vivo enquanto a pessoa ajusta. "Restaurar padrão" volta a 19 · 1,90 · 0%.
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Sheet, Slider, Switch, Text, makeStyles, useTheme } from '@/shared/ui';

import type { ReadingAdjust } from '../data/readingPrefs';

const fmtLine = (v: number) => `${v.toFixed(2).replace('.', ',')}×`;
const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v}%`;

export function ReadingSheet({
  visible,
  onClose,
  reading,
  onChange,
  onReset,
}: {
  visible: boolean;
  onClose(): void;
  reading: ReadingAdjust;
  onChange(patch: Partial<ReadingAdjust>): void;
  onReset(): void;
}) {
  const s = useStyles();
  const t = useTheme();
  const r = t.reading;
  return (
    <Sheet visible={visible} onClose={onClose} title="Leitura" veil="light">
      <View style={s.body}>
        <Adjust title="Tamanho do texto" value={`${reading.fontSize} px`}>
          <Slider
            label="Tamanho do texto"
            valueText={`${reading.fontSize} pixels`}
            value={reading.fontSize}
            min={r.fontSize.min}
            max={r.fontSize.max}
            step={r.fontSize.step}
            onChange={(fontSize) => onChange({ fontSize })}
            startAdornment={<Text variant="caption" tone="tertiary">A</Text>}
            endAdornment={<Text variant="heading" tone="tertiary">A</Text>}
          />
        </Adjust>
        <Adjust title="Espaço entre as linhas" value={fmtLine(reading.lineHeight)}>
          <Slider
            label="Espaço entre as linhas"
            valueText={fmtLine(reading.lineHeight)}
            value={reading.lineHeight}
            min={r.lineHeight.min}
            max={r.lineHeight.max}
            step={r.lineHeight.step}
            onChange={(lineHeight) => onChange({ lineHeight })}
          />
        </Adjust>
        <Adjust title="Espaço entre as letras" value={fmtPct(reading.letterSpacing)}>
          <Slider
            label="Espaço entre as letras"
            valueText={fmtPct(reading.letterSpacing)}
            value={reading.letterSpacing}
            min={r.letterSpacing.min}
            max={r.letterSpacing.max}
            step={r.letterSpacing.step}
            onChange={(letterSpacing) => onChange({ letterSpacing })}
          />
        </Adjust>
        <View style={s.switchRow}>
          <Text variant="item" style={s.grow}>
            Números dos versículos
          </Text>
          <Switch label="Números dos versículos" value={reading.verseNumbers} onChange={(verseNumbers) => onChange({ verseNumbers })} />
        </View>
        <Text variant="caption" tone="tertiary">
          Os grifos sempre deixam um respiro entre uma linha e a próxima, em qualquer ajuste.
        </Text>
        <View style={s.actions}>
          <Button label="Restaurar padrão" variant="secondary" onPress={onReset} grow />
          <Button label="Pronto" onPress={onClose} grow />
        </View>
      </View>
    </Sheet>
  );
}

function Adjust({ title, value, children }: { title: string; value: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.adjust}>
      <View style={s.adjustTop}>
        <Text variant="caption" tone="tertiary" style={s.grow}>
          {title}
        </Text>
        <Text variant="mono" tone="secondary" numeric>
          {value}
        </Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  body: { gap: t.space[5] },
  adjust: { gap: t.space[1] },
  adjustTop: { flexDirection: 'row', alignItems: 'baseline', gap: t.space[3] },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.listRowSmall },
  actions: { flexDirection: 'row', gap: t.space[2.5] },
  grow: { flex: 1 },
}));
