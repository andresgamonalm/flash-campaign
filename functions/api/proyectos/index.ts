import { guardar, guardarColeccion, leerColeccion, obtener } from '../../_lib/almacen'
import { ahora, conSesion, cuerpoJson, error, idNuevo, json, type Env } from '../../_lib/entorno'
import { registrarEvento } from '../../_lib/historial'

/**
 * Cada proyecto se guarda en su propia clave (`proyecto:<id>`) y el índice sólo
 * conserva los metadatos. Así abrir la lista no obliga a leer todos los diseños,
 * que son la parte pesada del documento.
 */

export interface ResumenProyecto {
  id: string
  nombre: string
  propietarioId: string
  propietarioEmail: string
  canales: string[]
  estado: 'en_curso' | 'realizado'
  marcaId: string | null
  creadoEn: string
  actualizadoEn: string
}

const INDICE = 'proyectos'

export async function leerIndice(env: Env) {
  return leerColeccion<ResumenProyecto>(env, INDICE)
}

export async function escribirIndice(env: Env, items: ResumenProyecto[]) {
  await guardarColeccion(env, INDICE, items)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const indice = await leerIndice(env)
    const visibles = sesion.rol === 'admin' ? indice : indice.filter((p) => p.propietarioId === sesion.uid)
    return json({ proyectos: visibles.sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn)) })
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const entrada = await cuerpoJson<Record<string, unknown>>(request)
    const nombre = String(entrada.nombre ?? '').trim()
    if (!nombre) return error('La campaña necesita un nombre.', 422)

    const canales = Array.isArray(entrada.canales) ? (entrada.canales as string[]) : []
    if (!canales.length) return error('Elige al menos una plataforma para la campaña.', 422)

    const indice = await leerIndice(env)
    const id = typeof entrada.id === 'string' && entrada.id ? entrada.id : idNuevo('proy')
    const previo = await obtener<Record<string, unknown>>(env, `proyecto:${id}`)

    if (previo && sesion.rol !== 'admin' && previo.propietarioId !== sesion.uid) {
      return error('No puedes modificar una campaña de otro usuario.', 403)
    }

    const proyecto: Record<string, unknown> = {
      ...(previo ?? {}),
      ...entrada,
      id,
      nombre,
      canales,
      propietarioId: (previo?.propietarioId as string) ?? sesion.uid,
      estado: (entrada.estado as string) ?? (previo?.estado as string) ?? 'en_curso',
      creadoEn: (previo?.creadoEn as string) ?? ahora(),
      actualizadoEn: ahora(),
    }

    await guardar(env, `proyecto:${id}`, proyecto)

    const resumen: ResumenProyecto = {
      id,
      nombre,
      propietarioId: proyecto.propietarioId as string,
      propietarioEmail: (previo?.propietarioEmail as string) ?? sesion.email,
      canales,
      estado: proyecto.estado as ResumenProyecto['estado'],
      marcaId: (proyecto.marcaId as string | null) ?? null,
      creadoEn: proyecto.creadoEn as string,
      actualizadoEn: proyecto.actualizadoEn as string,
    }
    await escribirIndice(env, [...indice.filter((p) => p.id !== id), resumen])

    await registrarEvento(env, {
      usuarioId: sesion.uid,
      usuarioEmail: sesion.email,
      proyectoId: id,
      proyectoNombre: nombre,
      tipo: previo ? 'proyecto_actualizado' : 'proyecto_creado',
      detalle: previo ? 'Guardó cambios de la campaña' : `Creó la campaña para ${canales.join(', ')}`,
    })

    return json({ proyecto }, { status: previo ? 200 : 201 })
  })
