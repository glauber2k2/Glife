import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AI_TOOLS, defineAiTool, findAiTool, needsConfirmation, type AiToolDefinition } from '../index.ts';

const base = (over: Partial<AiToolDefinition>): AiToolDefinition => ({
  name: 'notes_create',
  description: 'Cria uma nota.',
  input: z.object({}),
  risk: 'write',
  ...over,
});

describe('política de confirmação', () => {
  it('leitura e escrita simples não pedem confirmação', () => {
    expect(needsConfirmation(base({ risk: 'read' }))).toBe(false);
    expect(needsConfirmation(base({ risk: 'write' }))).toBe(false);
  });

  it('confirm, dinheiro e lote pedem confirmação', () => {
    expect(needsConfirmation(base({ risk: 'confirm' }))).toBe(true);
    expect(needsConfirmation(base({ risk: 'write', money: true }))).toBe(true);
    expect(needsConfirmation(base({ risk: 'write', bulk: true }))).toBe(true);
  });
});

describe('defineAiTool', () => {
  it('recusa nome fora do padrão e descrição vazia', () => {
    expect(() => defineAiTool(base({ name: 'Criar Nota' }))).toThrow();
    expect(() => defineAiTool(base({ description: '  ' }))).toThrow();
  });

  it('aceita nome em snake_case', () => {
    expect(defineAiTool(base({ name: 'notes_create' })).name).toBe('notes_create');
  });
});

describe('registro', () => {
  it('não tem nomes repetidos e acha pelo nome', () => {
    const names = AI_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of AI_TOOLS) expect(findAiTool(t.name)).toBe(t);
    expect(findAiTool('nao_existe')).toBeUndefined();
  });
});
