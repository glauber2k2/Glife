import { describe, expect, it } from 'vitest';

import { ATTACH, OLD_ATTACHMENT_KEEP, attachmentKind, attachmentPart, compactAttachmentHistory, fitAttachments, parseAttachmentPart } from '../attachments.ts';

describe('anexos da Glife IA', () => {
  it('limites do design', () => {
    expect(ATTACH).toEqual({ perFile: 60_000, perMessage: 120_000, maxFiles: 3, pdfBytes: 10_000_000 });
  });

  it('tipo pelo nome ou pelo mime', () => {
    expect(attachmentKind('Relatório.PDF')).toBe('pdf');
    expect(attachmentKind('notas.md')).toBe('text');
    expect(attachmentKind('gastos.csv')).toBe('text');
    expect(attachmentKind('leia.txt')).toBe('text');
    expect(attachmentKind('sem-extensao', 'application/pdf')).toBe('pdf');
    expect(attachmentKind('sem-extensao', 'text/plain')).toBe('text');
    expect(attachmentKind('foto.jpg', 'image/jpeg')).toBeNull();
  });

  it('parte de texto marcada ida e volta; nome sem quebra de linha', () => {
    const part = attachmentPart('meu\narquivo.txt', 'conteúdo\ncom linhas');
    expect(part.startsWith('[Anexo: meu arquivo.txt]\n')).toBe(true);
    expect(parseAttachmentPart(part)).toEqual({ name: 'meu arquivo.txt', text: 'conteúdo\ncom linhas' });
    expect(parseAttachmentPart('texto comum')).toBeNull();
  });

  it('corta cada arquivo em 60 mil e avisa', () => {
    const r = fitAttachments([{ name: 'a.txt', text: 'x'.repeat(70_000) }]);
    expect(r.kept[0]!.text).toHaveLength(60_000);
    expect(r.kept[0]!.truncated).toBe(true);
    expect(r.notices).toEqual(['a.txt passou de 60 mil caracteres: só o começo vai para a IA.']);
  });

  it('no máximo 3 arquivos e 120 mil no total', () => {
    const big = (name: string) => ({ name, text: 'y'.repeat(50_000) });
    const r = fitAttachments([big('1.txt'), big('2.txt'), big('3.txt'), big('4.txt')]);
    expect(r.kept.map((k) => k.name)).toEqual(['1.txt', '2.txt', '3.txt']);
    expect(r.kept.map((k) => k.text.length)).toEqual([50_000, 50_000, 20_000]);
    expect(r.kept[2]!.truncated).toBe(true);
    expect(r.notices).toContain('Só 3 anexos por mensagem: 4.txt ficou de fora.');
    expect(r.notices).toContain('3.txt foi cortado para caber no limite de 120 mil caracteres por mensagem.');
  });

  it('arquivo vazio sai com aviso', () => {
    const r = fitAttachments([{ name: 'vazio.txt', text: '   ' }]);
    expect(r.kept).toEqual([]);
    expect(r.notices).toEqual(['vazio.txt está vazio.']);
  });
});

describe('histórico com anexos', () => {
  const user = (id: string, ...texts: string[]) => ({ id, role: 'user' as const, parts: texts.map((text) => ({ type: 'text', text })) });
  const bot = (id: string) => ({ id, role: 'assistant' as const, parts: [{ type: 'text', text: 'ok' }] });

  it('só a mensagem mais recente com anexo vai inteira; as antigas viram trecho', () => {
    const old = attachmentPart('velho.pdf', 'a'.repeat(50_000));
    const recent = attachmentPart('novo.txt', 'b'.repeat(30_000));
    const out = compactAttachmentHistory([user('1', 'leia', old), bot('2'), user('3', 'e este', recent), bot('4'), user('5', 'resuma')]);
    const oldOut = parseAttachmentPart(out[0]!.parts[1]!.text as string)!;
    expect(oldOut.name).toBe('velho.pdf');
    expect(oldOut.text.startsWith('a'.repeat(OLD_ATTACHMENT_KEEP))).toBe(true);
    expect(oldOut.text).toContain('[trecho: o anexo inteiro foi lido numa mensagem anterior]');
    expect(oldOut.text.length).toBeLessThan(OLD_ATTACHMENT_KEEP + 100);
    expect(out[2]!.parts[1]!.text).toBe(recent);
    expect(out[4]).toEqual(user('5', 'resuma'));
  });

  it('sem anexos, nada muda', () => {
    const msgs = [user('1', 'oi'), bot('2')];
    expect(compactAttachmentHistory(msgs)).toEqual(msgs);
  });
});
