import { isAuthError, type AuthErrorCode } from '@glife/domain/auth';

/** Em que etapa a mensagem aparece: o mesmo código pede explicações diferentes. */
export type AuthContext = 'signin' | 'enroll' | 'verify' | 'account';

export type AuthMessageTone = 'danger' | 'secondary' | 'warning';
export type AuthMessageIcon = 'alert' | 'offline' | 'wait';

export interface AuthMessage {
  text: string;
  /** erro só quando é culpa da digitação; falta de internet não é culpa do usuário */
  tone: AuthMessageTone;
  icon: AuthMessageIcon;
}

export function errorCodeOf(e: unknown): AuthErrorCode {
  return isAuthError(e) ? e.code : 'unknown';
}

export function authMessage(code: AuthErrorCode, context: AuthContext): AuthMessage {
  switch (code) {
    case 'invalid_credentials':
      return { text: 'E-mail ou senha incorretos.', tone: 'danger', icon: 'alert' };
    case 'invalid_code':
      return {
        text:
          context === 'enroll'
            ? 'Código inválido. Use o código que aparece agora no app; ele muda a cada 30 segundos.'
            : 'Código inválido ou expirado. Confira se a data e a hora do celular estão em automático e use o código atual.',
        tone: 'danger',
        icon: 'alert',
      };
    case 'rate_limited':
      return { text: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.', tone: 'warning', icon: 'wait' };
    case 'network':
      return { text: 'Sem conexão com o servidor. Verifique a internet.', tone: 'secondary', icon: 'offline' };
    case 'unknown':
      return { text: 'Algo deu errado. Tente de novo.', tone: 'danger', icon: 'alert' };
  }
}
