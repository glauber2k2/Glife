// Registro das ações da IA no banco local, com "Desfazer". Cada `undo` das features é idempotente; se um falhar,
// a ação não é marcada como desfeita e dá para tentar de novo.
import type { AiToolKit, AiTouch } from '@glife/domain/ai';
import { isRepositoryError, newId, nowIso, type LocalDb } from '@glife/domain/core';

import { errorText } from '@/shared/lib/errorText';

import type { ActionLog, AiActionEntry, NewAiAction } from '../executor';

interface Row {
  id: string;
  conversation_id: string;
  tool: string;
  summary: string;
  touches: string;
  created_at: string;
  seq: number;
  undone_at: string | null;
}

export type UndoResult = { ok: true } | { ok: false; reason: string };

export interface AiActionLog extends ActionLog {
  list(limit?: number): Promise<AiActionEntry[]>;
  undo(id: string, kit: AiToolKit): Promise<UndoResult>;
}

const toEntry = ({ seq: _seq, ...r }: Row): AiActionEntry => ({ ...r, touches: JSON.parse(r.touches) as AiTouch[] });

export function createActionLog(db: LocalDb, clock: () => Date = () => new Date()): AiActionLog {
  return {
    async record(entry: NewAiAction) {
      const last = await db.getOptional<{ seq: number | null }>('SELECT MAX(seq) AS seq FROM ai_actions');
      const row: Row = { id: newId(), ...entry, touches: JSON.stringify(entry.touches), created_at: nowIso(clock), seq: (last?.seq ?? 0) + 1, undone_at: null };
      await db.execute(
        'INSERT INTO ai_actions (id, conversation_id, tool, summary, touches, created_at, seq, undone_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [row.id, row.conversation_id, row.tool, row.summary, row.touches, row.created_at, row.seq, row.undone_at],
      );
      return toEntry(row);
    },
    async list(limit = 50) {
      const rows = await db.getAll<Row>('SELECT * FROM ai_actions ORDER BY seq DESC LIMIT ?', [limit]);
      return rows.map(toEntry);
    },
    async undo(id, kit) {
      const row = await db.getOptional<Row>('SELECT * FROM ai_actions WHERE id = ?', [id]);
      if (!row) return { ok: false, reason: 'Ação não encontrada.' };
      if (row.undone_at) return { ok: false, reason: 'Esta ação já foi desfeita.' };
      const entry = toEntry(row);
      try {
        for (const t of [...entry.touches].reverse()) {
          const undo = kit.undo[t.entity];
          if (!undo) return { ok: false, reason: 'Não sei desfazer esta ação.' };
          await undo(t);
        }
      } catch (e) {
        if (isRepositoryError(e, 'not_found')) return { ok: false, reason: 'O item não existe mais.' };
        return { ok: false, reason: errorText(e) };
      }
      await db.execute('UPDATE ai_actions SET undone_at = ? WHERE id = ?', [nowIso(clock), id]);
      return { ok: true };
    },
  };
}
