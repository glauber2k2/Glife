import { createContext, useContext, type ReactNode } from 'react';

/**
 * Em que superfície o componente está: no fundo do app ('bg') ou dentro de um cartão/folha ('card').
 * Campos, chips e botões circulares trocam o preenchimento sozinhos (branco no fundo, cinza no cartão).
 */
export type Surface = 'bg' | 'card';

const SurfaceContext = createContext<Surface>('bg');

export function SurfaceProvider({ value, children }: { value: Surface; children: ReactNode }) {
  return <SurfaceContext.Provider value={value}>{children}</SurfaceContext.Provider>;
}

export function useSurface(): Surface {
  return useContext(SurfaceContext);
}
