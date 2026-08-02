import crypto from 'crypto';

const NOMBRE_COOKIE = 'autor_session';

function firmar(payload) {
  const secreto = process.env.AUTHOR_PASSWORD || '';
  return crypto.createHmac('sha256', secreto).update(payload).digest('hex');
}

export function crearToken() {
  const payload = 'autor';
  return `${payload}.${firmar(payload)}`;
}

export function tokenValido(valor) {
  if (!valor || !process.env.AUTHOR_PASSWORD) return false;
  const [payload, firma] = valor.split('.');
  if (payload !== 'autor' || !firma) return false;
  const esperada = firmar(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada));
  } catch {
    return false;
  }
}

export { NOMBRE_COOKIE };
