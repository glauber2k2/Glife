import { parseBibleRef, toOsis } from '@glife/domain/bible';

export async function handler(req: Request): Promise<Response> {
  const input = new URL(req.url).searchParams.get('ref');
  if (!input?.trim()) {
    return Response.json({ error: 'Informe uma referência bíblica no parâmetro ref.' }, { status: 400 });
  }

  const ref = parseBibleRef(input);
  if (!ref) return Response.json({ error: 'Referência bíblica inválida.' }, { status: 400 });

  return Response.json({ osis: toOsis(ref) });
}
