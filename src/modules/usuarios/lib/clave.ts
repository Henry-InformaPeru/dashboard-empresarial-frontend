// Reglas de contraseña que exige la API: 12 a 72 caracteres con mayúscula, minúscula, número y símbolo.

export interface RequisitoClave {
  texto: string;
  ok: boolean;
}

export const requisitosClave = (clave: string): RequisitoClave[] => [
  { texto: '12 o más caracteres', ok: clave.length >= 12 && clave.length <= 72 },
  { texto: 'Una mayúscula', ok: /[A-Z]/.test(clave) },
  { texto: 'Una minúscula', ok: /[a-z]/.test(clave) },
  { texto: 'Un número', ok: /[0-9]/.test(clave) },
  { texto: 'Un símbolo (por ejemplo ! # $ %)', ok: /[^A-Za-z0-9]/.test(clave) },
];

export const claveValida = (clave: string): boolean => requisitosClave(clave).every((r) => r.ok);

const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O (se confunden con 1 y 0)
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz'; // sin l
const NUMEROS = '23456789';
const SIMBOLOS = '!#$%*+-=?@_';

const aleatorio = (limite: number): number => {
  // Sin sesgo: se descartan los valores que no caben en un múltiplo de «limite»
  const maximo = Math.floor(0x100000000 / limite) * limite;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= maximo);
  return buffer[0] % limite;
};

const elegir = (juego: string): string => juego[aleatorio(juego.length)];

// Clave aleatoria que cumple todas las reglas (16 caracteres por defecto)
export function generarClave(largo = 16): string {
  const todos = MAYUSCULAS + MINUSCULAS + NUMEROS + SIMBOLOS;
  const caracteres = [elegir(MAYUSCULAS), elegir(MINUSCULAS), elegir(NUMEROS), elegir(SIMBOLOS)];
  while (caracteres.length < largo) caracteres.push(elegir(todos));
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}
