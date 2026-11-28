// Pedido por voz: usa o reconhecimento de voz do sistema em pt-BR (no Android, o serviço de voz do aparelho,
// normalmente o do Google; no Chrome, o do navegador, que também envia o áudio ao Google). O Glife não grava nem
// guarda áudio; só o texto transcrito segue para a Glife IA.
// O módulo nativo é carregado só na hora (um APK sem ele não pode quebrar a barra de abas) e uma sessão por vez:
// a próxima só começa depois do fim da anterior, para o microfone nunca ficar ligado sem tela.
import { createTranscript } from './transcript';

export type VoiceStart = 'ok' | 'denied' | 'unavailable';

export interface VoiceSession {
  /** Para de ouvir e devolve o texto final (espera o último resultado por até `finishWait` ms). */
  finish(): Promise<string>;
  /** Para sem resultado. */
  cancel(): void;
}

interface Sub {
  remove(): void;
}
/** O pedaço do expo-speech-recognition que o app usa (injetável nos testes). */
export interface SpeechModule {
  isRecognitionAvailable(): boolean;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  addListener(name: 'start' | 'end', l: () => void): Sub;
  addListener(name: 'result', l: (e: { isFinal: boolean; results: { transcript: string }[] }) => void): Sub;
  addListener(name: 'error', l: (e: { error: string }) => void): Sub;
  start(options: { lang: string; interimResults: boolean; continuous: boolean; addsPunctuation?: boolean }): void;
  stop(): void;
  abort(): void;
}

const FINISH_WAIT_MS = 1500;

const loadNative = async (): Promise<SpeechModule> =>
  (await import('expo-speech-recognition')).ExpoSpeechRecognitionModule as unknown as SpeechModule;

export function createVoice(load: () => Promise<SpeechModule> = loadNative, finishWait = FINISH_WAIT_MS) {
  // termina quando a sessão anterior recebeu "end" (ou desistiu de esperar)
  let previous: Promise<void> = Promise.resolve();

  async function start(onText: (text: string) => void, onFail: (message: string) => void): Promise<{ status: VoiceStart; session?: VoiceSession }> {
    let mod: SpeechModule;
    try {
      mod = await load();
      if (!mod.isRecognitionAvailable()) return { status: 'unavailable' };
    } catch {
      return { status: 'unavailable' }; // módulo nativo ausente (APK antigo) ou navegador sem suporte
    }
    const perm = await mod.requestPermissionsAsync().catch(() => null);
    if (!perm?.granted) return { status: 'denied' };

    await previous;
    let markEnded!: () => void;
    const ended = new Promise<void>((resolve) => (markEnded = resolve));
    previous = Promise.race([ended, new Promise<void>((r) => setTimeout(r, finishWait))]);

    const transcript = createTranscript();
    let live = false; // só depois do "start" desta sessão
    let isEnded = false;
    const subs: Sub[] = [
      mod.addListener('start', () => {
        live = true;
      }),
      mod.addListener('result', (e) => {
        if (!live) return;
        transcript.push(e.results[0]?.transcript ?? '', e.isFinal);
        onText(transcript.text());
      }),
      mod.addListener('error', (e) => {
        // "no-speech"/"aborted" não são falhas para quem soltou o botão sem falar
        if (live && e.error !== 'no-speech' && e.error !== 'aborted') onFail('Não deu para ouvir agora. Tente de novo ou digite.');
      }),
      mod.addListener('end', () => {
        if (!live) return;
        isEnded = true;
        markEnded();
      }),
    ];
    const cleanup = () => subs.forEach((s) => s.remove());

    mod.start({ lang: 'pt-BR', interimResults: true, continuous: true, addsPunctuation: true });

    return {
      status: 'ok',
      session: {
        finish: async () => {
          mod.stop();
          if (!isEnded) await Promise.race([ended, new Promise((r) => setTimeout(r, finishWait))]);
          cleanup();
          return transcript.text();
        },
        cancel: () => {
          mod.abort();
          cleanup();
          markEnded();
        },
      },
    };
  }

  return { start };
}

/** A voz do app (uma sessão por vez). */
export const voice = createVoice();
