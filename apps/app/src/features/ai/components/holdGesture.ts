// Gesto do botão da Glife IA (no estilo da gravação de áudio do WhatsApp), como máquina de estados pura:
// toque curto abre o compositor; segurar ≥ HOLD_MS começa a ouvir e soltar envia; arrastar LOCK_DY para cima
// trava (o dedo pode sair) e só "Enviar" envia. A tela traduz os toques em eventos e executa os efeitos.

export const HOLD_MS = 250;
export const LOCK_DY = 64;

export type HoldState =
  | { phase: 'idle' }
  | { phase: 'pressing'; since: number }
  | { phase: 'recording'; lockProgress: number }
  | { phase: 'locked' };

export type HoldEvent =
  | { type: 'down'; at: number }
  | { type: 'tick'; at: number }
  | { type: 'move'; dy: number }
  | { type: 'up'; at: number }
  | { type: 'send' }
  | { type: 'cancel' };

export type HoldEffect = 'openComposer' | 'startVoice' | 'lock' | 'sendVoice' | 'cancelVoice';

const IDLE: HoldState = { phase: 'idle' };

export function holdStep(state: HoldState, event: HoldEvent): { state: HoldState; effect?: HoldEffect } {
  switch (state.phase) {
    case 'idle':
      return event.type === 'down' ? { state: { phase: 'pressing', since: event.at } } : { state };
    case 'pressing':
      if (event.type === 'tick' && event.at - state.since >= HOLD_MS) return { state: { phase: 'recording', lockProgress: 0 }, effect: 'startVoice' };
      if (event.type === 'up') return { state: IDLE, effect: 'openComposer' };
      if (event.type === 'cancel') return { state: IDLE };
      return { state };
    case 'recording':
      if (event.type === 'move') {
        const progress = Math.min(1, Math.max(0, -event.dy / LOCK_DY));
        return progress >= 1 ? { state: { phase: 'locked' }, effect: 'lock' } : { state: { phase: 'recording', lockProgress: progress } };
      }
      if (event.type === 'up' || event.type === 'send') return { state: IDLE, effect: 'sendVoice' };
      if (event.type === 'cancel') return { state: IDLE, effect: 'cancelVoice' };
      return { state };
    case 'locked':
      if (event.type === 'send') return { state: IDLE, effect: 'sendVoice' };
      if (event.type === 'cancel') return { state: IDLE, effect: 'cancelVoice' };
      return { state };
  }
}
