import { folderDestinations, type NoteFolder } from '@glife/domain/notes';
import { Check, Folder, FolderOpen } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon, ListGroup, NavRow, makeStyles, useTheme } from '@/shared/ui';

/** Um destino por id, com caminho para distinguir nomes iguais. Também serve para mover a própria pasta. */
export function FolderPicker({ folders, selectedId, movingId, rootLabel = 'Sem pasta', disabled, onPick, footer }: {
  folders: readonly NoteFolder[];
  selectedId?: string | null;
  movingId?: string;
  rootLabel?: string;
  disabled?: boolean;
  onPick: (folder: NoteFolder | null) => void;
  footer?: ReactNode;
}) {
  const s = useStyles();
  const t = useTheme();
  const destinations = useMemo(() => folderDestinations(folders, movingId), [folders, movingId]);
  const mark = (selected: boolean) => <View style={!selected && s.hidden}><Icon icon={Check} color="accent" size={t.icon.size} /></View>;
  return (
    <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
      <ListGroup>
        <NavRow icon={FolderOpen} label={rootLabel} trailing={mark(selectedId === null)} onPress={disabled ? undefined : () => onPick(null)} />
        {destinations.map(({ folder, path }) => (
          <NavRow key={folder.id} icon={Folder} module="notes" label={folder.name} wrapMeta
            meta={path === folder.name ? 'Na raiz' : path.slice(0, -(folder.name.length + ' / '.length))}
            trailing={mark(selectedId === folder.id)} onPress={disabled ? undefined : () => onPick(folder)} />
        ))}
        {footer}
      </ListGroup>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  hidden: { opacity: t.opacity.hidden },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0, maxHeight: t.layout.pickerListMaxHeight },
}));
