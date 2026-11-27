// Contas puras do leitor: quando as barras somem/voltam ao rolar e as medidas do texto.

const MOVE = 4;
const HIDE_AFTER = 80;
const SHOW_BEFORE = 40;

/** Barras visíveis depois deste passo de rolagem? Descer esconde (passado o topo); subir ou chegar ao topo mostra. */
export function chromeVisibility({ prevY, y, visible }: { prevY: number; y: number; visible: boolean }): boolean {
  if (y < SHOW_BEFORE) return true;
  if (y > prevY + MOVE && y > HIDE_AFTER) return false;
  if (y < prevY - MOVE) return true;
  return visible;
}

/** Espaço entre letras guardado em % do tamanho da letra, em px. */
export function letterSpacingPx(fontSize: number, percent: number): number {
  return percent === 0 ? 0 : (fontSize * percent) / 100;
}

const WORDS_PER_MINUTE = 190;

export function readMinutes(verses: readonly string[]): number {
  const words = verses.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
