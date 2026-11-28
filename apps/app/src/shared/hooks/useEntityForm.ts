// Ciclo de um formulário de entidade (novo ou editar): carrega, guarda o texto dos campos, lê e valida ao salvar,
// cria ou atualiza e volta; excluir mostra "Desfazer". Telas só desenham campos; regras ficam no domain.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { errorText } from '@/shared/lib/errorText';
import { useToast } from '@/shared/ui';

export type FormResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface EntityFormOptions<E, F, D> {
  /** undefined = nova entidade */
  id: string | undefined;
  load: (id: string) => Promise<E>;
  toForm: (entity: E) => F;
  empty: () => F;
  read: (form: F) => FormResult<D>;
  create: (draft: D) => Promise<unknown>;
  update: (id: string, draft: D) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  /** "Evento excluído" */
  removedMessage: string;
  /**
   * Gravação junto com o item (ex.: notas vinculadas). Devolve como desfazer. Tudo ou nada: ao editar, roda antes e é
   * desfeita se o item não grava; ao criar, roda depois e, se falhar, o item recém-criado é excluído.
   */
  extra?: { apply(id: string): Promise<() => Promise<void>> };
}

export function useEntityForm<E, F, D>(o: EntityFormOptions<E, F, D>) {
  const toast = useToast();
  const [form, setFormState] = useState<F>(o.empty);
  const [entity, setEntity] = useState<E | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(o.id ? 'loading' : 'ready');
  const [saving, setSaving] = useState(false);
  const { id, load, toForm } = o;

  useEffect(() => {
    if (!id) return;
    let active = true;
    load(id).then(
      (e) => {
        if (!active) return;
        setEntity(e);
        setFormState(toForm(e));
        setState('ready');
      },
      () => active && setState('missing'),
    );
    return () => {
      active = false;
    };
    // Carrega uma vez por id (as funções vêm de fora e mudam a cada render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setForm = (patch: Partial<F>) => setFormState((f) => ({ ...f, ...patch }));

  const save = async () => {
    const r = o.read(form);
    if (!r.ok) return toast({ message: r.error });
    setSaving(true);
    try {
      if (o.id) {
        const undo = o.extra ? await o.extra.apply(o.id) : null;
        try {
          await o.update(o.id, r.value);
        } catch (e) {
          await undo?.().catch(() => undefined);
          throw e;
        }
      } else {
        const created = await o.create(r.value);
        const newId = (created as { id?: unknown } | null)?.id;
        if (o.extra && typeof newId === 'string') {
          try {
            await o.extra.apply(newId);
          } catch (e) {
            // O item não fica pela metade: some de novo e a pessoa tenta outra vez.
            await o.remove(newId).catch(() => undefined);
            throw e;
          }
        }
      }
      router.back();
    } catch (e) {
      toast({ message: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!o.id) return;
    const removedId = o.id;
    try {
      await o.remove(removedId);
      router.back();
      toast({ message: o.removedMessage, actionLabel: 'Desfazer', onAction: () => void o.restore(removedId), aboveTabBar: false });
    } catch (e) {
      toast({ message: errorText(e) });
    }
  };

  return { form, setForm, entity, state, saving, save, remove, isNew: !o.id };
}
