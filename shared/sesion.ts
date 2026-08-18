/**
 * Token de sesión firmado con HMAC-SHA256.
 *
 * No se usa una librería de JWT porque el token sólo viaja entre este
 * aplicativo y sus propias funciones: basta con firmar un payload compacto y
 * comprobar la firma y la expiración en cada petición.
 */

export interface Sesion {
  uid: string
  email: string
  rol: 'admin' | 'usuario'
  exp: number
}

const CODIFICADOR = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function desdeB64url(texto: string): Uint8Array {
  const normalizado = texto.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = normalizado + '='.repeat((4 - (normalizado.length % 4)) % 4)
  const binario = atob(relleno)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

async function claveHmac(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', CODIFICADOR.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export async function firmarSesion(sesion: Sesion, secreto: string): Promise<string> {
  const cuerpo = b64url(CODIFICADOR.encode(JSON.stringify(sesion)))
  const firma = await crypto.subtle.sign('HMAC', await claveHmac(secreto), CODIFICADOR.encode(cuerpo))
  return `${cuerpo}.${b64url(new Uint8Array(firma))}`
}

export async function leerSesion(token: string, secreto: string): Promise<Sesion | null> {
  const [cuerpo, firma] = token.split('.')
  if (!cuerpo || !firma) return null
  const valido = await crypto.subtle.verify(
    'HMAC',
    await claveHmac(secreto),
    desdeB64url(firma) as BufferSource,
    CODIFICADOR.encode(cuerpo),
  )
  if (!valido) return null
  try {
    const sesion = JSON.parse(new TextDecoder().decode(desdeB64url(cuerpo))) as Sesion
    if (!sesion.exp || sesion.exp < Date.now()) return null
    return sesion
  } catch {
    return null
  }
}

export const DURACION_SESION_MS = 1000 * 60 * 60 * 12
export const COOKIE_SESION = 'flash_sesion'
