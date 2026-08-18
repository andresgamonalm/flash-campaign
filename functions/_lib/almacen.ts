import type { Env } from './entorno'

/**
 * Capa de persistencia.
 *
 * Prioridad: KV enlazado → memoria del isolate. La memoria existe sólo para que
 * el aplicativo sea usable inmediatamente después del primer despliegue, antes de
 * enlazar el espacio KV; no persiste entre reinicios y el aplicativo lo advierte
 * en pantalla. Las imágenes usan R2 cuando está enlazado y KV en caso contrario.
 */

const memoria = new Map<string, string>()
const memoriaBinaria = new Map<string, { bytes: ArrayBuffer; tipo: string }>()

export function almacenamientoPersistente(env: Env): boolean {
  return Boolean(env.FLASH_KV)
}

export function almacenamientoImagenes(env: Env): 'r2' | 'kv' | 'memoria' {
  if (env.MEDIA) return 'r2'
  if (env.FLASH_KV) return 'kv'
  return 'memoria'
}

export async function obtener<T>(env: Env, clave: string): Promise<T | null> {
  if (env.FLASH_KV) {
    const valor = await env.FLASH_KV.get(clave)
    return valor ? (JSON.parse(valor) as T) : null
  }
  const valor = memoria.get(clave)
  return valor ? (JSON.parse(valor) as T) : null
}

export async function guardar<T>(env: Env, clave: string, valor: T): Promise<void> {
  const texto = JSON.stringify(valor)
  if (env.FLASH_KV) {
    await env.FLASH_KV.put(clave, texto)
    return
  }
  memoria.set(clave, texto)
}

export async function eliminar(env: Env, clave: string): Promise<void> {
  if (env.FLASH_KV) {
    await env.FLASH_KV.delete(clave)
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
  if (env.MEDIA) {
    await env.MEDIA.put(clave, bytes, { httpMetadata: { contentType: tipo } })
    return
  }
  if (env.FLASH_KV) {
    await env.FLASH_KV.put(`bin:${clave}`, bytes, { metadata: { tipo } })
    return
  }
  memoriaBinaria.set(clave, { bytes, tipo })
}

export async function leerBinario(
  env: Env,
  clave: string,
): Promise<{ bytes: ArrayBuffer; tipo: string } | null> {
  if (env.MEDIA) {
    const objeto = await env.MEDIA.get(clave)
    if (!objeto) return null
    return { bytes: await objeto.arrayBuffer(), tipo: objeto.httpMetadata?.contentType ?? 'application/octet-stream' }
  }
  if (env.FLASH_KV) {
    const resultado = await env.FLASH_KV.getWithMetadata<{ tipo: string }>(`bin:${clave}`, 'arrayBuffer')
    if (!resultado.value) return null
    return { bytes: resultado.value, tipo: resultado.metadata?.tipo ?? 'application/octet-stream' }
  }
  return memoriaBinaria.get(clave) ?? null
}

export async function eliminarBinario(env: Env, clave: string): Promise<void> {
  if (env.MEDIA) {
    await env.MEDIA.delete(clave)
    return
  }
  if (env.FLASH_KV) {
    await env.FLASH_KV.delete(`bin:${clave}`)
    return
  }
  memoriaBinaria.delete(clave)
}
