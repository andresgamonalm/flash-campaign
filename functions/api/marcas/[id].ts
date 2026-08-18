import { guardarColeccion, leerColeccion } from '../../_lib/almacen'
import { conSesion, error, json, type Env } from '../../_lib/entorno'

interface Marca {
  id: string
  propietarioId: string | null
  esSistema: boolean
  nombre: string
}

const COLECCION = 'marcas'

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
  conSesion(request, env, async (sesion) => {
    const id = String(params.id)
    const marcas = await leerColeccion<Marca>(env, COLECCION)
    const marca = marcas.find((m) => m.id === id)
    if (!marca) return error('La marca ya no existe.', 404)
    if (marca.esSistema) return error('La marca Zurich viene con el aplicativo y no se elimina.', 409)
    if (sesion.rol !== 'admin' && marca.propietarioId !== sesion.uid) {
      return error('No puedes eliminar una marca de otro usuario.', 403)
    }
    await guardarColeccion(env, COLECCION, marcas.filter((m) => m.id !== id))
    return json({ ok: true })
  })
