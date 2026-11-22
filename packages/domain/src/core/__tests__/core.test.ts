import { describe, expect, it } from 'vitest';
import { baseEntitySchema, isAlive, restore, softDelete, stampNew } from '../index.ts';

const USER = '00000000-0000-4000-8000-0000000000aa';
const clock = () => new Date('2026-11-22T12:00:00Z');

describe('entidade base', () => {
  it('stampNew gera entidade válida', () => {
    const e = stampNew({ title: 'x' }, USER, clock);
    expect(baseEntitySchema.parse(e)).toBeTruthy();
    expect(e.created_at).toBe('2026-11-22T12:00:00.000Z');
    expect(isAlive(e)).toBe(true);
  });
  it('softDelete e restore', () => {
    const e = softDelete(stampNew({}, USER, clock), clock);
    expect(isAlive(e)).toBe(false);
    expect(isAlive(restore(e))).toBe(true);
  });
});
