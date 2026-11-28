import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-file-system', () => ({ File: vi.fn() }));
vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }));
vi.mock('@/shared/lib/supabase', () => ({
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }),
}));

import { readAttachments } from '../src/features/ai/data/attachments';

type Asset = Parameters<typeof readAttachments>[0][number];
const asset = (name: string, content: string, over: Partial<Asset> = {}): Asset =>
  ({ name, uri: `blob:${name}`, mimeType: undefined, size: content.length, file: new File([content], name), lastModified: 0, ...over }) as Asset;

afterEach(() => vi.unstubAllGlobals());

describe('leitura dos anexos', () => {
  it('texto é lido no aparelho; tipo não aceito vira aviso', async () => {
    const r = await readAttachments([asset('notas.md', '# oi'), asset('foto.jpg', 'x', { mimeType: 'image/jpeg' })]);
    expect(r.attachments).toEqual([{ name: 'notas.md', text: '# oi', truncated: false }]);
    expect(r.notices).toEqual(['foto.jpg: só PDF, TXT, MD e CSV.']);
  });

  it('PDF vai à função e volta como texto; cortado no servidor avisa', async () => {
    const fetch = vi.fn(async () => Response.json({ text: 'texto do pdf', pages: 1, truncated: true }));
    vi.stubGlobal('fetch', fetch);
    const r = await readAttachments([asset('a.pdf', '%PDF')]);
    expect(r.attachments).toEqual([{ name: 'a.pdf', text: 'texto do pdf', truncated: true }]);
    expect(r.notices).toEqual(['a.pdf passou de 60 mil caracteres: só o começo vai para a IA.']);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/functions\/v1\/extract-text$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('PDF acima de 10 MB não é enviado', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const r = await readAttachments([asset('grande.pdf', '%PDF', { size: 10_000_001 })]);
    expect(fetch).not.toHaveBeenCalled();
    expect(r.notices).toEqual(['grande.pdf: o PDF passa de 10 MB.']);
  });

  it('PDF digitalizado: o aviso do servidor chega ao usuário e os outros anexos seguem', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Este PDF não tem texto: parece ser uma imagem digitalizada.' }, { status: 422 })));
    const r = await readAttachments([asset('scan.pdf', '%PDF'), asset('ok.txt', 'conteúdo')]);
    expect(r.attachments.map((a) => a.name)).toEqual(['ok.txt']);
    expect(r.notices).toEqual(['scan.pdf: Este PDF não tem texto: parece ser uma imagem digitalizada.']);
  });
});
