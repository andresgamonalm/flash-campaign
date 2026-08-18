import { eliminar, obtener } from '../../_lib/almacen'
import { conSesion, error, json, type Env } from '../../_lib/entorno'
import { escribirIndice, leerIndice } from './index'

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) =>
  conSesion(request, env, async (sesion) => {
    const id = String(params.id)
    const proyecto = await obtener<Record<string, unknown>>(env, `proyecto:${id}`)
    if (!proyecto) return error('La campaña no existe o fue eliminada.', 404)
    if (sesion.rol !== 'admin' && proyecto.propietarioId !== sesion.uid) {
      return error('No tienes acceso a esta campaña.', 403)
    }
    return json({ proyecto })
  })

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) =>
  conSesion(request, env, async (sesion) => {
    const id = String(params.id)
    const proyecto = await obtener<Record<string, unknown>>(env, `proyecto:${id}`)
    if (!proyecto) return error('La campaña ya no existe.', 404)
    if (sesion.rol !== 'admin' && proyecto.propietarioId !== sesion.uid) {
      return error('No puedes eliminar una campaña de otro usuario.', 403)
    }
    await eliminar(env, `proyecto:${id}`)
    const indice = await leerIndice(env)
    await escribirIndice(env, indice.filter((p) => p.id !== id))
    return json({ ok: true })
  })
