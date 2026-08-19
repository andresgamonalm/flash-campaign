import semilla from '../../data/usuarios.json'
import { COOKIE_SESION, DURACION_SESION_MS, firmarSesion, leerSesion } from '../../shared/sesion'
import type { Sesion } from '../../shared/sesion'

export interface Env {
  /** Base de datos D1 donde persisten usuarios, marcas, proyectos e historial. */
  DB?: D1Database
  /** Alternativa a D1: espacio KV con el mismo propósito. */
  FLASH_KV?: KVNamespace
  /** Bucket R2 para la biblioteca de imágenes. */
  IMAGENES?: R2Bucket
  MEDIA?: R2Bucket
  /** Nombres alternativos si los enlaces de la cuenta usan otra etiqueta. */
  D1_BINDING?: string
  KV_BINDING?: string
  R2_BINDING?: string
  /** Secreto para firmar la cookie de sesión. */
  SESSION_SECRET?: string
  /** Nombre que usa este proyecto en Cloudflare para el mismo secreto. */
  JWT_SECRET?: string
  /** Correo que debe tener rol de administrador. */
  SUPER_ADMIN_EMAIL?: string
  /** Clave de la API de Google Gemini que usa el asistente Char B. */
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  /** Base alternativa de la API de Gemini (proxy corporativo o entorno de prueba). */
  GEMINI_BASE_URL?: string
  /** Base pública de las imágenes ya cargadas en Cloudflare. */
  MEDIA_BASE_URL?: string
  /** Manifiesto JSON opcional con las imágenes existentes en Cloudflare. */
  MEDIA_MANIFEST_URL?: string
}

export interface UsuarioAlmacenado {
  id: string
  email: string
  /** Nombre de usuario alternativo: se puede entrar con esto o con el correo. */
  usuario?: string
  nombre: string
  rol: 'admin' | 'usuario'
  activo: boolean
  correoContacto?: string
  zonaHoraria: string
  creadoEn: string
  hash: string
}

export const USUARIOS_SEMILLA = (semilla as { usuarios: UsuarioAlmacenado[] }).usuarios

/**
 * Modelos que prueba Char B, en orden de preferencia.
 *
 * No se fija un número de versión a propósito. Google retira modelos para las
 * cuentas nuevas sin aviso —el aplicativo hermano se quedó sin servicio dos veces
 * por eso, con gemini-2.0-flash y con gemini-2.5-pro— y un nombre concreto tarde
 * o temprano devuelve 404. El alias `gemini-flash-latest` apunta siempre al
 * modelo rápido más reciente que tenga la cuenta, así que Char B se mantiene en
 * la última generación sin tener que perseguir nombres.
 *
 * Se recorre la lista hasta que una responde; `GEMINI_MODEL` en Cloudflare tiene
 * prioridad sobre todas.
 */
export const MODELOS_GEMINI = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-pro-latest']

export function json(datos: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(datos), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(init.headers ?? {}) },
  })
}

export function error(mensaje: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return json({ error: mensaje, ...extra }, { status })
}

export function secretoSesion(env: Env): string {
  // El proyecto en Cloudflare guarda este secreto como JWT_SECRET.
  const definido = env.SESSION_SECRET || env.JWT_SECRET
  if (definido) return definido
  // Sin secreto configurado se deriva uno estable del hash del administrador.
  // Nunca sale del servidor y sobrevive a los reinicios porque el archivo semilla
  // vive en el repositorio, pero conviene definir SESSION_SECRET en Cloudflare.
  return `flash-campaign::${USUARIOS_SEMILLA[0]?.hash ?? 'sin-semilla'}`
}

export function leerCookie(request: Request, nombre: string): string | null {
  const cookies = request.headers.get('cookie')
  if (!cookies) return null
  for (const parte of cookies.split(';')) {
    const [clave, ...resto] = parte.trim().split('=')
    if (clave === nombre) return decodeURIComponent(resto.join('='))
  }
  return null
}

export async function crearCookieSesion(sesion: Omit<Sesion, 'exp'>, env: Env, url: URL): Promise<string> {
  const token = await firmarSesion({ ...sesion, exp: Date.now() + DURACION_SESION_MS }, secretoSesion(env))
  const seguro = url.protocol === 'https:' ? ' Secure;' : ''
  return `${COOKIE_SESION}=${encodeURIComponent(token)}; Path=/; HttpOnly;${seguro} SameSite=Lax; Max-Age=${Math.floor(
    DURACION_SESION_MS / 1000,
  )}`
}

export function cookieBorrada(url: URL): string {
  const seguro = url.protocol === 'https:' ? ' Secure;' : ''
  return `${COOKIE_SESION}=; Path=/; HttpOnly;${seguro} SameSite=Lax; Max-Age=0`
}

export async function sesionDe(request: Request, env: Env): Promise<Sesion | null> {
  const token = leerCookie(request, COOKIE_SESION)
  if (!token) return null
  return leerSesion(token, secretoSesion(env))
}

/** Envuelve un manejador exigiendo sesión válida. */
export async function conSesion(
  request: Request,
  env: Env,
  manejador: (sesion: Sesion) => Promise<Response>,
): Promise<Response> {
  const sesion = await sesionDe(request, env)
  if (!sesion) return error('Sesión no válida o expirada. Vuelve a iniciar sesión.', 401)
  return manejador(sesion)
}

export async function conAdmin(
  request: Request,
  env: Env,
  manejador: (sesion: Sesion) => Promise<Response>,
): Promise<Response> {
  return conSesion(request, env, async (sesion) => {
    if (sesion.rol !== 'admin') return error('Esta acción es exclusiva del administrador.', 403)
    return manejador(sesion)
  })
}

export async function cuerpoJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error('El cuerpo de la petición no es JSON válido.')
  }
}

export function ahora(): string {
  return new Date().toISOString()
}

export function idNuevo(prefijo: string): string {
  return `${prefijo}_${crypto.randomUUID()}`
}
