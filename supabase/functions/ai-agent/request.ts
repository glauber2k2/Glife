// Formato do pedido do app (useChat → DefaultChatTransport): as mensagens da conversa e a data local de hoje.
import { z } from 'zod';

// 400 mil: histórico + até 120 mil de anexos por mensagem (o teto em dólar segue valendo pela reserva).
export const MAX_BODY = 400_000;
export const MAX_MESSAGES = 60;

const part = z.looseObject({ type: z.string().max(80) });
const message = z.looseObject({
  id: z.string().max(100),
  role: z.enum(['user', 'assistant']),
  parts: z.array(part).max(100),
});

export const aiRequestSchema = z.looseObject({
  messages: z.array(message).min(1).max(MAX_MESSAGES),
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type AiRequest = z.infer<typeof aiRequestSchema>;
