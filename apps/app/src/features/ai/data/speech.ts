// Pedido por voz: reconhecimento no aparelho (Android) ou no navegador (Chrome), em pt-BR. O app não grava nem
// envia áudio; só o texto transcrito segue para a Glife IA. Exige o módulo nativo (APK novo).
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { createTranscript } from './transcript';

export type VoiceStart = 'ok' | 'denied' | 'unavailable';

export interface VoiceSession {
  /** Para de ouvir e devolve o texto final (espera o último resultado por até FINISH_WAIT_MS). */
  finish(): Promise<string>;
  /** Para sem resultado. */
  cancel(): void;
}

const FINISH_WAIT_MS = 1500;

function available(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false; // módulo nativo ausente (APK antigo)
  }
}

export async function startVoice(onText: (text: string) => void, onFail: (message: string) => void): Promise<{ status: VoiceStart; session?: VoiceSession }> {
  if (!available()) return { status: 'unavailable' };
  const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
  if (!perm?.granted) return { status: 'denied' };

  const transcript = createTranscript();
  let ended = false;
  let onEnd: (() => void) | null = null;
  const subs = [
    ExpoSpeechRecognitionModule.addListener('result', (e) => {
      transcript.push(e.results[0]?.transcript ?? '', e.isFinal);
      onText(transcript.text());
    }),
    ExpoSpeechRecognitionModule.addListener('error', (e) => {
      // "no-speech"/"aborted" não são falhas para quem soltou o botão sem falar
      if (e.error !== 'no-speech' && e.error !== 'aborted') onFail('Não deu para ouvir agora. Tente de novo ou digite.');
    }),
    ExpoSpeechRecognitionModule.addListener('end', () => {
      ended = true;
      onEnd?.();
    }),
  ];
  const cleanup = () => subs.forEach((s) => s.remove());

  ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: true, addsPunctuation: true });

  return {
    status: 'ok',
    session: {
      finish: () =>
        new Promise<string>((resolve) => {
          const done = () => {
            cleanup();
            resolve(transcript.text());
          };
          if (ended) return done();
          const timer = setTimeout(done, FINISH_WAIT_MS);
          onEnd = () => {
            clearTimeout(timer);
            done();
          };
          ExpoSpeechRecognitionModule.stop();
        }),
      cancel: () => {
        cleanup();
        if (!ended) ExpoSpeechRecognitionModule.abort();
      },
    },
  };
}
