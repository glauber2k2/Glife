// Anexos da Glife IA: escolhe arquivos e extrai o texto. TXT/MD/CSV são lidos no aparelho; o texto do PDF vem da
// Edge Function `extract-text` (o PDF vai só a ela, com a sessão aal2, e não é guardado). Limites: domain/ai.
import { ATTACH, attachmentKind, fitAttachments } from '@glife/domain/ai';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { errorText, UserFacingError } from '@/shared/lib/errorText';
import type { PromptAttachment } from '@/shared/lib/aiPrompt';
import { getSupabase } from '@/shared/lib/supabase';

type Asset = DocumentPicker.DocumentPickerAsset;

const web = Platform.OS === 'web';
const readText = async (a: Asset) => (web && a.file ? a.file.text() : new File(a.uri).text());
const readBytes = async (a: Asset) => (web && a.file ? new Uint8Array(await a.file.arrayBuffer()) : new File(a.uri).bytes());

async function extractPdf(bytes: Uint8Array): Promise<{ text: string; truncated: boolean }> {
  const token = (await getSupabase().auth.getSession()).data.session?.access_token;
  if (!token) throw new UserFacingError('Entre de novo: a sessão terminou.');
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/extract-text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/pdf' },
    body: bytes as unknown as BodyInit,
  });
  const body = (await res.json().catch(() => ({}))) as { text?: string; truncated?: boolean; error?: string };
  if (!res.ok || typeof body.text !== 'string') throw new UserFacingError(body.error ?? `O servidor não leu o PDF (código ${res.status}).`);
  return { text: body.text, truncated: body.truncated === true };
}

/** Lê os arquivos escolhidos; o que não deu certo vira aviso (nunca derruba os outros). */
export async function readAttachments(assets: readonly Asset[]): Promise<{ attachments: PromptAttachment[]; notices: string[] }> {
  const notices: string[] = [];
  const raw: { name: string; text: string; cut: boolean }[] = [];
  for (const a of assets) {
    const kind = attachmentKind(a.name, a.mimeType);
    if (!kind) {
      notices.push(`${a.name}: só PDF, TXT, MD e CSV.`);
      continue;
    }
    try {
      if (kind === 'text') raw.push({ name: a.name, text: await readText(a), cut: false });
      else if ((a.size ?? 0) > ATTACH.pdfBytes) notices.push(`${a.name}: o PDF passa de 10 MB.`);
      else {
        const pdf = await extractPdf(await readBytes(a));
        if (pdf.truncated) notices.push(`${a.name} passou de 60 mil caracteres: só o começo vai para a IA.`);
        raw.push({ name: a.name, text: pdf.text, cut: pdf.truncated });
      }
    } catch (e) {
      notices.push(`${a.name}: ${errorText(e)}`);
    }
  }
  const fitted = fitAttachments(raw);
  const cut = new Set(raw.filter((r) => r.cut).map((r) => r.name));
  return {
    attachments: fitted.kept.map((k) => ({ name: k.name, text: k.text, truncated: k.truncated || cut.has(k.name) })),
    notices: [...notices, ...fitted.notices],
  };
}

export async function pickAttachments() {
  const res = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'text/*'],
  });
  if (res.canceled || !res.assets.length) return null;
  return readAttachments(res.assets);
}
