// Edge Function `extract-text`: recebe um PDF (corpo cru, até 10 MB) e devolve só o texto, para o app anexar à
// conversa da Glife IA. Exige sessão aal2. Nada é gravado nem registrado: o PDF e o texto vivem só neste pedido.
import { ATTACH } from '@glife/domain/ai';

import { requireAal2, type VerifyJwt } from '../_shared/auth.ts';

export type ExtractPdf = (bytes: Uint8Array) => Promise<{ text: string; pages: number }>;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
const TOO_BIG = 'O PDF passa de 10 MB. Envie um arquivo menor.';

export function createExtractHandler(deps: { verify: VerifyJwt; extract: ExtractPdf }) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

    const auth = await requireAal2(req, deps.verify);
    if ('status' in auth) return json({ error: auth.error }, auth.status);

    const type = (req.headers.get('Content-Type') ?? '').split(';')[0]!.trim().toLowerCase();
    if (type !== 'application/pdf') return json({ error: 'Só PDF.' }, 415);
    if (Number(req.headers.get('Content-Length') ?? '0') > ATTACH.pdfBytes) return json({ error: TOO_BIG }, 413);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength > ATTACH.pdfBytes) return json({ error: TOO_BIG }, 413);

    let result: { text: string; pages: number };
    try {
      result = await deps.extract(bytes);
    } catch {
      return json({ error: 'Não deu para ler este PDF (arquivo danificado ou protegido).' }, 422);
    }
    const text = result.text.trim();
    if (!text) return json({ error: 'Este PDF não tem texto: parece ser uma imagem digitalizada.' }, 422);
    const truncated = text.length > ATTACH.perFile;
    return json({ text: truncated ? text.slice(0, ATTACH.perFile) : text, pages: result.pages, truncated });
  };
}
