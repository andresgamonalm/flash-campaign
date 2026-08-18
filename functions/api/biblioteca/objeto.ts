import { PREFIJO_SUBIDAS, r2De } from '../../_lib/almacen'
import { error, sesionDe, type Env } from '../../_lib/entorno'

/**
 * Entrega una imagen del catálogo que ya existe en el bucket R2 de la cuenta.
 *
 * Se sirve a través del aplicativo, y no del bucket público, para que el catálogo
 * exija sesión igual que el resto de la biblioteca. Cuando la cuenta expone el
 * bucket con un dominio público basta con definir `MEDIA_BASE_URL` y la interfaz
 * apunta directo allí, sin pasar por esta ruta.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const sesion = await sesionDe(request, env)
  if (!sesion) return error('Sesión no válida o expirada.', 401)

  const clave = new URL(request.url).searchParams.get('clave')
  if (!clave) return error('Falta indicar la clave del archivo.', 422)

  // El catálogo común nunca incluye las subidas de los usuarios: ésas tienen su
  // propia ruta con control de propietario.
  if (clave.startsWith(PREFIJO_SUBIDAS) || clave.includes('..')) {
    return error('Esa ruta no pertenece al catálogo común.', 403)
  }

  const bucket = r2De(env)
  if (!bucket) return error('No hay un bucket R2 enlazado en este despliegue.', 503)

  const objeto = await bucket.get(clave)
  if (!objeto) return error('La imagen no existe en el bucket.', 404)

  return new Response(objeto.body, {
    headers: {
      'content-type': objeto.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'private, max-age=86400',
      etag: objeto.httpEtag,
    },
  })
}
