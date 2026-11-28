// Todas as ferramentas do agente, juntadas das features. A Edge Function envia estas definições ao modelo e o app
// confere que cada uma tem executor.
import type { AiToolDefinition } from './tool.ts';

export const AI_TOOLS: readonly AiToolDefinition[] = [];

const BY_NAME = new Map(AI_TOOLS.map((t) => [t.name, t]));

export function findAiTool(name: string): AiToolDefinition | undefined {
  return BY_NAME.get(name);
}
