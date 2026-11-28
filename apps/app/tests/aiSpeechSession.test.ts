import { describe, expect, it, vi } from 'vitest';

import { createVoice, type SpeechModule } from '../src/features/ai/data/speech';

type Listener = (e: unknown) => void;

function fakeModule() {
  const listeners = new Map<string, Set<Listener>>();
  const emit = (name: string, e: unknown = null) => listeners.get(name)?.forEach((l) => l(e));
  const mod = {
    isRecognitionAvailable: () => true,
    requestPermissionsAsync: async () => ({ granted: true }),
    addListener: (name: string, l: Listener) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(l);
      return { remove: () => listeners.get(name)!.delete(l) };
    },
    start: vi.fn(() => emit('start')),
    stop: vi.fn(),
    abort: vi.fn(),
  };
  return { mod: mod as unknown as SpeechModule & typeof mod, emit };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('sessão de voz', () => {
  it('APK sem o módulo nativo: indisponível, sem quebrar', async () => {
    const voice = createVoice(async () => {
      throw new Error("Cannot find native module 'ExpoSpeechRecognition'");
    });
    expect((await voice.start(() => {}, () => {})).status).toBe('unavailable');
  });

  it('cancelar sempre aborta o reconhecimento', async () => {
    const { mod, emit } = fakeModule();
    const voice = createVoice(async () => mod);
    const r = await voice.start(() => {}, () => {});
    emit('end'); // fim espontâneo
    r.session!.cancel();
    expect(mod.abort).toHaveBeenCalledTimes(1);
  });

  it('a segunda sessão só começa quando a primeira terminou, e não ouve o fim da primeira', async () => {
    const { mod, emit } = fakeModule();
    const voice = createVoice(async () => mod, 50);
    const heard: string[] = [];
    const first = await voice.start(() => {}, () => {});
    const finishing = first.session!.finish(); // espera o "end"
    const secondP = voice.start((t) => heard.push(t), () => {});
    await flush();
    expect(mod.start).toHaveBeenCalledTimes(1); // a segunda ainda espera
    emit('end'); // fim da primeira
    await finishing;
    const second = await secondP;
    expect(mod.start).toHaveBeenCalledTimes(2);
    emit('result', { isFinal: false, results: [{ transcript: 'oi' }] });
    expect(heard).toEqual(['oi']);
    // terminar a segunda chama stop (o fim da primeira não marcou a segunda como encerrada)
    const done = second.session!.finish();
    emit('end');
    await done;
    expect(mod.stop).toHaveBeenCalledTimes(2);
  });
});
