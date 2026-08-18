import { conSesion, cuerpoJson, json, type Env } from '../_lib/entorno'
import { listarHistorial, registrarEvento } from '../_lib/historial'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    // El administrador revisa la actividad completa; cada usuario ve la suya.
    const eventos = await listarHistorial(env, sesion.rol === 'admin' ? undefined : sesion.uid)
    return json({ eventos })
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const datos = await cuerpoJson<{
      tipo: string
      detalle: string
      proyectoId?: string
      proyectoNombre?: string
      formato?: string
    }>(request)
    const evento = await registrarEvento(env, {
      usuarioId: sesion.uid,
      usuarioEmail: sesion.email,
      tipo: datos.tipo,
      detalle: datos.detalle,
      proyectoId: datos.proyectoId,
      proyectoNombre: datos.proyectoNombre,
      formato: datos.formato,
    })
    return json({ evento }, { status: 201 })
  })
