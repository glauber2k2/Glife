const PREFIX = /^data:image\/svg\+xml(;[^,]*)?,/;

/** O Supabase entrega o QR como `data:image/svg+xml;utf-8,<svg…>`; o SvgXml precisa só do SVG. */
export function svgFromDataUrl(dataUrl: string): string | null {
  let body = dataUrl.trim();
  if (body.startsWith('data:')) {
    if (!PREFIX.test(body)) return null;
    body = body.replace(PREFIX, '');
  }
  if (body.startsWith('%3C')) {
    try {
      body = decodeURIComponent(body);
    } catch {
      return null;
    }
  }
  return body.startsWith('<svg') ? body : null;
}
