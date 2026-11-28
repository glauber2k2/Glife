// Junta os kits de ferramentas das features (puro, sem React).
import type { AiToolKit } from '@glife/domain/ai';

/** Junta os kits; o mesmo nome de ferramenta em dois kits é erro de montagem. */
export function mergeKits(kits: readonly AiToolKit[]): AiToolKit {
  const merged: AiToolKit = { executors: {}, undo: {}, preview: {} };
  for (const kit of kits) {
    for (const [name, run] of Object.entries(kit.executors)) {
      if (merged.executors[name]) throw new Error(`Ferramenta de IA repetida: ${name}`);
      merged.executors[name] = run;
    }
    Object.assign(merged.undo, kit.undo);
    Object.assign(merged.preview!, kit.preview ?? {});
  }
  return merged;
}
