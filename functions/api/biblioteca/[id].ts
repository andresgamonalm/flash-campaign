import { eliminarBinario, guardarColeccion, leerBinario, leerColeccion } from '../../_lib/almacen'
import { conSesion, error, json, sesionDe, type Env } from '../../_lib/entorno'
import type { ImagenBiblioteca } from './index'

const COLECCION = 'imagenes'

/** Entrega el archivo. Requiere sesión: la biblioteca no es pública. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const sesion = await sesionDe(request, env)
  if (!sesion) return error('Sesión no válida o expirada.', 401)

  const id = String(params.id)
  const imagenes = await leerColeccion<ImagenBiblioteca>(env, COLECCION)
  const imagen = imagenes.find((i) => i.id === id)
  if (!imagen) return error('La imagen no existe.', 404)
  if (sesion.rol !== 'admin' && imagen.propietarioId && imagen.propietarioId !== sesion.uid) {
    return error('Esta imagen pertenece a otro usuario.', 403)
  }

  const archivo = await leerBinario(env, imagen.clave ?? `img/${id}`)
  if (!archivo) return error('El archivo ya no está disponible en el almacenamiento.', 410)

  return new Response(archivo.bytes, {
    headers: {
      'content-type': archivo.tipo,
      'cache-control': 'private, max-age=86400',
      'content-length': String(archivo.bytes.byteLength),
    },
  })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
  conSesion(request, env, async (sesion) => {
    const id = String(params.id)
    const imagenes = await leerColeccion<ImagenBiblioteca>(env, COLECCION)
    const imagen = imagenes.find((i) => i.id === id)
    if (!imagen) return error('La imagen ya no existe.', 404)
    if (sesion.rol !== 'admin' && imagen.propietarioId !== sesion.uid) {
      return error('No puedes eliminar imágenes de otro usuario.', 403)
    }
    await eliminarBinario(env, imagen.clave ?? `img/${id}`)
    await guardarColeccion(env, COLECCION, imagenes.filter((i) => i.id !== id))
    return json({ ok: true })
  })
