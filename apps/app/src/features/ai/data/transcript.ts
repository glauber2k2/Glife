// Junta os resultados do reconhecimento de voz: os finais ficam, o parcial é trocado a cada evento.
export function createTranscript() {
  const finals: string[] = [];
  let partial = '';
  return {
    push(text: string, isFinal: boolean) {
      const clean = text.trim();
      if (isFinal) {
        if (clean) finals.push(clean);
        partial = '';
      } else partial = clean;
    },
    text: () => [...finals, partial].filter(Boolean).join(' '),
  };
}
