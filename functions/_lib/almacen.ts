import type { Env } from './entorno'

/**
 * Capa de persistencia.
 *
 * El proyecto en Cloudflare tiene enlazada una base de datos D1 (`DB`) y un
 * bucket R2 (`IMAGENES`), así que ése es el camino principal. Se admiten también
 * un espacio KV y los nombres `MEDIA` o `FLASH_KV`, y como último recurso la
 * memoria del isolate para que el aplicativo abra aunque no haya nada enlazado
 * (avisándolo en pantalla, porque así no persiste nada).
 *
 * Los enlaces se buscan por nombre, nunca por su forma: Pages expone enlaces
 * propios como `ASSETS` que responden a cualquier propiedad y una detección
 * automática acaba eligiendo el equivocado.
 */

const memoria = new Map<string, string>()
const memoriaBinaria = new Map<string, { bytes: ArrayBuffer; tipo: string }>()

/** Enlaces propios de Pages que nunca son almacenamiento del aplicativo. */
const RESERVADOS = new Set(['ASSETS'])

function buscar<T>(env: Env, indicado: string | undefined, candidatos: string[]): { nombre: string; enlace: T } | null {
  const registro = env as unknown as Record<string, unknown>
  const nombres = indicado?.trim() ? [indicado.trim()] : candidatos
  for (const nombre of nombres) {
    if (RESERVADOS.has(nombre)) continue
    const valor = registro[nombre]
    if (valor && typeof valor === 'object') return { nombre, enlace: valor as T }
  }
  return null
}

export function nombreEnlaceD1(env: Env): string | null {
  return buscar<D1Database>(env, env.D1_BINDING, ['DB', 'FLASH_DB'])?.nombre ?? null
}

export function nombreEnlaceKV(env: Env): string | null {
  return buscar<KVNamespace>(env, env.KV_BINDING, ['FLASH_KV', 'KV'])?.nombre ?? null
}

export function nombreEnlaceR2(env: Env): string | null {
  return buscar<R2Bucket>(env, env.R2_BINDING, ['IMAGENES', 'MEDIA'])?.nombre ?? null
}

export function d1De(env: Env): D1Database | null {
  return buscar<D1Database>(env, env.D1_BINDING, ['DB', 'FLASH_DB'])?.enlace ?? null
}

export function kvDe(env: Env): KVNamespace | null {
  return buscar<KVNamespace>(env, env.KV_BINDING, ['FLASH_KV', 'KV'])?.enlace ?? null
}

export function r2De(env: Env): R2Bucket | null {
  return buscar<R2Bucket>(env, env.R2_BINDING, ['IMAGENES', 'MEDIA'])?.enlace ?? null
}

export function almacenamientoDatos(env: Env): 'd1' | 'kv' | 'memoria' {
  if (d1De(env)) return 'd1'
  if (kvDe(env)) return 'kv'
  return 'memoria'
}

export function almacenamientoPersistente(env: Env): boolean {
  return almacenamientoDatos(env) !== 'memoria'
}

export function almacenamientoImagenes(env: Env): 'r2' | 'kv' | 'd1' | 'memoria' {
  if (r2De(env)) return 'r2'
  if (kvDe(env)) return 'kv'
  if (d1De(env)) return 'd1'
  return 'memoria'
}

/* ------------------------------------------------------------------ D1 --- */

const preparadas = new WeakSet<D1Database>()

/** Crea las tablas la primera vez que se usa la base en cada isolate. */
async function prepararD1(db: D1Database): Promise<void> {
  if (preparadas.has(db)) return
  await db.batch([
    db.prepare(
      'CREATE TABLE IF NOT EXISTS documentos (clave TEXT PRIMARY KEY, valor TEXT NOT NULL, actualizado_en TEXT NOT NULL)',
    ),
    db.prepare(
      'CREATE TABLE IF NOT EXISTS binarios (clave TEXT PRIMARY KEY, tipo TEXT NOT NULL, datos BLOB NOT NULL, creado_en TEXT NOT NULL)',
    ),
  ])
  preparadas.add(db)
}

function aArrayBuffer(datos: unknown): ArrayBuffer | null {
  if (datos instanceof ArrayBuffer) return datos
  if (ArrayBuffer.isView(datos)) {
    const vista = datos as ArrayBufferView
    return vista.buffer.slice(vista.byteOffset, vista.byteOffset + vista.byteLength) as ArrayBuffer
  }
  if (Array.isArray(datos)) return new Uint8Array(datos as number[]).buffer
  return null
}

/* ------------------------------------------------------------ Documentos --- */

export async function obtener<T>(env: Env, clave: string): Promise<T | null> {
  const db = d1De(env)
  if (db) {
    await prepararD1(db)
    const fila = await db.prepare('SELECT valor FROM documentos WHERE clave = ?').bind(clave).first<{ valor: string }>()
    return fila?.valor ? (JSON.parse(fila.valor) as T) : null
  }
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
  const db = d1De(env)
  if (db) {
    await prepararD1(db)
    await db
      .prepare(
        'INSERT INTO documentos (clave, valor, actualizado_en) VALUES (?, ?, ?) ' +
          'ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado_en = excluded.actualizado_en',
      )
      .bind(clave, texto, new Date().toISOString())
      .run()
    return
  }
  const kv = kvDe(env)
  if (kv) {
    await kv.put(clave, texto)
    return
  }
  memoria.set(clave, texto)
}

export async function eliminar(env: Env, clave: string): Promise<void> {
  const db = d1De(env)
  if (db) {
    await prepararD1(db)
    await db.prepare('DELETE FROM documentos WHERE clave = ?').bind(clave).run()
    return
  }
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

/* --------------------------------------------------------------- Binarios --- */

export async function guardarBinario(env: Env, clave: string, bytes: ArrayBuffer, tipo: string): Promise<void> {
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
  const db = d1De(env)
  if (db) {
    await prepararD1(db)
    await db
      .prepare(
        'INSERT INTO binarios (clave, tipo, datos, creado_en) VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT(clave) DO UPDATE SET tipo = excluded.tipo, datos = excluded.datos',
      )
      .bind(clave, tipo, bytes, new Date().toISOString())
      .run()
    return
  }
  memoriaBinaria.set(clave, { bytes, tipo })
}

export async function leerBinario(env: Env, clave: string): Promise<{ bytes: ArrayBuffer; tipo: string } | null> {
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
  const db = d1De(env)
  if (db) {
    await prepararD1(db)
    const fila = await db
      .prepare('SELECT tipo, datos FROM binarios WHERE clave = ?')
      .bind(clave)
      .first<{ tipo: string; datos: unknown }>()
    const bytes = fila ? aArrayBuffer(fila.datos) : null
    return bytes ? { bytes, tipo: fila!.tipo } : null
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
  const db = d1De(env)
  if (db) {
    await prepararD1(db)
    await db.prepare('DELETE FROM binarios WHERE clave = ?').bind(clave).run()
    return
  }
  memoriaBinaria.delete(clave)
}

/* ------------------------------------------------- Catálogo del bucket R2 --- */

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
