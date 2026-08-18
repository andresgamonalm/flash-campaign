/**
 * Derivación y verificación de contraseñas con PBKDF2-SHA256.
 *
 * El mismo módulo corre en el navegador y en las funciones de Cloudflare: ambos
 * exponen WebCrypto, así que no hay dependencias externas ni un algoritmo
 * distinto según el entorno. En el repositorio sólo viaja el hash, nunca la
 * contraseña en claro.
 */

const ITERACIONES = 150_000
const LARGO_BYTES = 32

function aBase64(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

function desdeBase64(texto: string): Uint8Array {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

async function derivar(clave: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(clave.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: iteraciones, hash: 'SHA-256' },
    material,
    LARGO_BYTES * 8,
  )
  return new Uint8Array(bits)
}

/** Formato almacenado: `pbkdf2$<iteraciones>$<sal b64>$<hash b64>`. */
export async function crearHash(clave: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivar(clave, sal, ITERACIONES)
  return `pbkdf2$${ITERACIONES}$${aBase64(sal)}$${aBase64(hash)}`
}

export async function verificarHash(clave: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split('$')
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false
  const iteraciones = Number(partes[1])
  if (!Number.isFinite(iteraciones) || iteraciones < 1000) return false
  const sal = desdeBase64(partes[2])
  const esperado = desdeBase64(partes[3])
  const obtenido = await derivar(clave, sal, iteraciones)
  if (obtenido.length !== esperado.length) return false
  // Comparación en tiempo constante para no filtrar información por el tiempo.
  let diferencia = 0
  for (let i = 0; i < obtenido.length; i += 1) diferencia |= obtenido[i] ^ esperado[i]
  return diferencia === 0
}

export function validarClave(clave: string): string | null {
  if (clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(clave)) return 'La contraseña debe incluir al menos una letra.'
  if (!/[0-9]/.test(clave)) return 'La contraseña debe incluir al menos un número.'
  return null
}
