// Guarda contra o crash nativo "[Worklets] Tried to synchronously call a Remote Function": o corpo de
// useAnimatedStyle/useAnimatedProps/... roda na thread de interface e só pode chamar worklets. Uma função JS comum
// (ex.: `clamp01`) derruba o app no Android sem passar pelo relatório de erro. Varredura por texto: chamadas no corpo
// dessas funções precisam ser de Reanimated, de `Math` ou de funções marcadas com 'worklet' no próprio arquivo.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', 'src');
const HOOKS = /\b(useAnimatedStyle|useAnimatedProps|useDerivedValue|useAnimatedReaction|useAnimatedScrollHandler|useFrameCallback|runOnUI)\(/g;
/** Funções que já são worklets ou nativas do runtime de interface. */
const SAFE = new Set([
  'Math',
  'Number',
  'Boolean',
  'String',
  'withTiming',
  'withSpring',
  'withDelay',
  'withSequence',
  'withRepeat',
  'withDecay',
  'withClamp',
  'interpolate',
  'interpolateColor',
  'cancelAnimation',
  'runOnJS',
  'scheduleOnRN',
]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, '');

/** Nomes de funções do arquivo marcadas com 'worklet'. */
function workletNames(src: string): Set<string> {
  const names = new Set<string>();
  for (const m of src.matchAll(/(?:function\s+(\w+)\s*\([^)]*\)[^{]*\{|const\s+(\w+)\s*=\s*\([^)]*\)[^=]*=>\s*\{)\s*['"]worklet['"]/g)) {
    names.add((m[1] ?? m[2])!);
  }
  return names;
}

/** Chamadas proibidas dentro dos corpos de worklet de um arquivo, como "arquivo:linha nome". */
function unsafeWorkletCalls(file: string, raw: string): string[] {
  const src = stripComments(raw);
  const allowed = workletNames(src);
  const out: string[] = [];
  for (const m of src.matchAll(HOOKS)) {
    let depth = 0;
    let end = m.index + m[0].length - 1;
    for (; end < src.length; end++) {
      if (src[end] === '(') depth++;
      else if (src[end] === ')' && --depth === 0) break;
    }
    const body = src.slice(m.index + m[0].length, end);
    for (const c of body.matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*\(/g)) {
      const name = c[1]!;
      if (SAFE.has(name) || allowed.has(name)) continue;
      const line = src.slice(0, m.index + m[0].length + c.index).split('\n').length;
      out.push(`${file}:${line} ${name}`);
    }
  }
  return out;
}

describe('worklets só chamam worklets', () => {
  it('detecta função comum dentro de useAnimatedStyle', () => {
    const bad = `const clamp = (n: number) => n;\nconst s = useAnimatedStyle(() => ({ opacity: clamp(v.get()) }));`;
    expect(unsafeWorkletCalls('x.tsx', bad)).toEqual(['x.tsx:2 clamp']);
    const ok = `const clamp = (n: number) => {\n  'worklet';\n  return n;\n};\nconst s = useAnimatedStyle(() => ({ opacity: clamp(Math.max(0, v.get())) }));`;
    expect(unsafeWorkletCalls('x.tsx', ok)).toEqual([]);
  });

  it('nenhuma animação do app chama função JS comum na thread de interface', () => {
    const problems = sourceFiles(SRC).flatMap((f) => unsafeWorkletCalls(relative(SRC, f), readFileSync(f, 'utf8')));
    expect(problems).toEqual([]);
  });
});
