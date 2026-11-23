import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Carrega ao focar a tela (e ao chamar `reload`): contagens e listas que não são observadas. */
export function useFocusData<T>(load: () => Promise<T>): { data: T | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadRef.current().then((v) => active && setData(v));
      return () => {
        active = false;
      };
      // `version` só existe para recarregar sob demanda (reload).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version]),
  );
  return { data, reload: () => setVersion((v) => v + 1) };
}
