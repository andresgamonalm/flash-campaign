import type { Env } from './entorno'

/**
 * Capa de persistencia.
 *
 * Prioridad: enlace real → memoria del isolate. La memoria existe sólo para que
 * el aplicativo sea usable inmediatamente después del primer despliegue, antes de
 * enlazar el espacio KV; no persiste entre reinicios y el aplicativo lo advierte
 * en pantalla. Las imágenes usan R2 cuando está enlazado y KV en caso contrario.
 *
 * Los enlaces se toman por su nombre: `FLASH_KV` y `MEDIA`. Si en la cuenta ya
 * existían con otro nombre, se indican con las variables `KV_BINDING` y
 * `R2_BINDING` en vez de adivinarlos: Pages expone otros enlaces propios (como
 * `ASSETS`) que responden a cualquier propiedad y una búsqueda por forma acaba
 * eligiendo el equivocado.
 */

const memoria = new Map<string, string>()
const memoriaBinaria = new Map<string, { bytes: ArrayBuffer; tipo: string }>()

/** Enlaces propios de Pages que nunca son almacenamiento del aplicativo. */
const RESERVADOS = new Set(['ASSETS'])

function enlacePorNombre<T>(env: Env, nombre: string): T | null {
  if (RESERVADOS.has(nombre)) return null
  const valor = (env as unknown as Record<string, unknown>)[nombre]
  return valor && typeof valor === 'object' ? (valor as T) : null
}

export function nombreEnlaceKV(env: Env): string | null {
  const nombre = env.KV_BINDING?.trim() || 'FLASH_KV'
  return enlacePorNombre<KVNamespace>(env, nombre) ? nombre : null
}

export function nombreEnlaceR2(env: Env): string | null {
  const nombre = env.R2_BINDING?.trim() || 'MEDIA'
  return enlacePorNombre<R2Bucket>(env, nombre) ? nombre : null
}

export function kvDe(env: Env): KVNamespace | null {
  const nombre = nombreEnlaceKV(env)
  return nombre ? enlacePorNombre<KVNamespace>(env, nombre) : null
}

export function r2De(env: Env): R2Bucket | null {
  const nombre = nombreEnlaceR2(env)
  return nombre ? enlacePorNombre<R2Bucket>(env, nombre) : null
}

export function almacenamientoPersistente(env: Env): boolean {
  return Boolean(kvDe(env))
}

export function almacenamientoImagenes(env: Env): 'r2' | 'kv' | 'memoria' {
  if (r2De(env)) return 'r2'
  if (kvDe(env)) return 'kv'
  return 'memoria'
}

export async function obtener<T>(env: Env, clave: string): Promise<T | null> {
  const kv = kvDe(env)
  if (kv) {
    const valor = await kv.get(clave)
    return valor ? (JSON.parse(valor) as T) : null
  }
  const valor = memoria.get(clave)
  return valor ? (JSON.parse(valor) as T) : null
}

export async function guardar<T>(env: Env, clave: string, valor: T): Promise<void> {
  const texto = JSON.stringify(valor)
  const kv = kvDe(env)
  if (kv) {
    await kv.put(clave, texto)
    return
  }
  memoria.set(clave, texto)
}

export async function eliminar(env: Env, clave: string): Promise<void> {
  const kv = kvDe(env)
  if (kv) {
    await kv.delete(clave)
    return
  }
  memoria.delete(clave)
}

/** Colecciones simples: se guardan como un único documento por tipo. */
export async function leerColeccion<T>(env: Env, nombre: string): Promise<T[]> {
  return (await obtener<T[]>(env, `col:${nombre}`)) ?? []
}

export async function guardarColeccion<T>(env: Env, nombre: string, items: T[]): Promise<void> {
  await guardar(env, `col:${nombre}`, items)
}

export async function guardarBinario(
  env: Env,
  clave: string,
  bytes: ArrayBuffer,
  tipo: string,
): Promise<void> {
  const bucket = r2De(env)
  if (bucket) {
    await bucket.put(clave, bytes, { httpMetadata: { contentType: tipo } })
    return
  }
  const kv = kvDe(env)
  if (kv) {
    await kv.put(`bin:${clave}`, bytes, { metadata: { tipo } })
    return
  }
  memoriaBinaria.set(clave, { bytes, tipo })
}

export async function leerBinario(
  env: Env,
  clave: string,
): Promise<{ bytes: ArrayBuffer; tipo: string } | null> {
  const bucket = r2De(env)
  if (bucket) {
    const objeto = await bucket.get(clave)
    if (!objeto) return null
    return { bytes: await objeto.arrayBuffer(), tipo: objeto.httpMetadata?.contentType ?? 'application/octet-stream' }
  }
  const kv = kvDe(env)
  if (kv) {
    const resultado = await kv.getWithMetadata<{ tipo: string }>(`bin:${clave}`, 'arrayBuffer')
    if (!resultado.value) return null
    return { bytes: resultado.value, tipo: resultado.metadata?.tipo ?? 'application/octet-stream' }
  }
  return memoriaBinaria.get(clave) ?? null
}

export async function eliminarBinario(env: Env, clave: string): Promise<void> {
  const bucket = r2De(env)
  if (bucket) {
    await bucket.delete(clave)
    return
  }
  const kv = kvDe(env)
  if (kv) {
    await kv.delete(`bin:${clave}`)
    return
  }
  memoriaBinaria.delete(clave)
}

/** Prefijo bajo el que el aplicativo guarda las imágenes que suben los usuarios. */
export const PREFIJO_SUBIDAS = 'img/'

export interface ObjetoBucket {
  clave: string
  nombre: string
  peso: number
  tipo: string
  subidoEn: string
}

const EXTENSIONES = /\.(jpe?g|png|webp|gif|svg)$/i
const TIPOS_POR_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

/**
 * Recorre el bucket y devuelve las imágenes que ya estaban cargadas en Cloudflare,
 * omitiendo las que subió el propio aplicativo (viven bajo `img/` y tienen su
 * propia ficha con propietario).
 */
export async function listarImagenesDelBucket(env: Env, maximo = 2000): Promise<ObjetoBucket[]> {
  const bucket = r2De(env)
  if (!bucket) return []

  const objetos: ObjetoBucket[] = []
  let cursor: string | undefined
  do {
    // Al pedir httpMetadata, R2 limita la página a 100 objetos.
    let pagina: R2Objects
    try {
      pagina = await bucket.list({ limit: 100, cursor, include: ['httpMetadata'] })
    } catch {
      // Un fallo del bucket no puede dejar sin biblioteca al usuario: se devuelve
      // lo recorrido hasta aquí y el resto de la biblioteca sigue funcionando.
      return objetos
    }
    for (const objeto of pagina.objects) {
      if (objeto.key.startsWith(PREFIJO_SUBIDAS)) continue
      if (objeto.key.endsWith('/') || objeto.size === 0) continue
      if (!EXTENSIONES.test(objeto.key)) continue
      const extension = objeto.key.split('.').pop()?.toLowerCase() ?? ''
      objetos.push({
        clave: objeto.key,
        nombre: objeto.key.split('/').pop() ?? objeto.key,
        peso: objeto.size,
        tipo: objeto.httpMetadata?.contentType || TIPOS_POR_EXTENSION[extension] || 'application/octet-stream',
        subidoEn: objeto.uploaded instanceof Date ? objeto.uploaded.toISOString() : new Date().toISOString(),
      })
    }
    cursor = pagina.truncated ? pagina.cursor : undefined
  } while (cursor && objetos.length < maximo)

  return objetos.slice(0, maximo)
}
