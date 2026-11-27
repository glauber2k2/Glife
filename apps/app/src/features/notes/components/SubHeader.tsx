import { Ellipsis, Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { BackHeader, IconButton, makeStyles } from '@/shared/ui';

import { goBack } from '../hooks/useNoteActions';

/** Cabeçalho das subtelas de Notas (TopBar do Cobalto): voltar, título central e ações circulares à direita. */
export function SubHeader({
  title,
  text,
  plusLabel,
  onPlus,
  moreLabel,
  onMore,
}: {
  /** mantido por compatibilidade: o TopBar não mostra rótulo acima do título */
  eyebrow?: string;
  title: string;
  text?: string;
  plusLabel?: string;
  onPlus?: () => void;
  /** menu "mais ações" (ex.: renomear e excluir a pasta) */
  moreLabel?: string;
  onMore?: () => void;
}) {
  const s = useStyles();
  const actions =
    (onMore && moreLabel) || (onPlus && plusLabel) ? (
      <View style={s.actions}>
        {onMore && moreLabel && <IconButton icon={Ellipsis} label={moreLabel} onPress={onMore} />}
        {onPlus && plusLabel && <IconButton icon={Plus} label={plusLabel} onPress={onPlus} />}
      </View>
    ) : undefined;
  return <BackHeader title={title} subtitle={text} onBack={() => goBack()} right={actions} />;
}

const useStyles = makeStyles((t) => ({
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
}));
