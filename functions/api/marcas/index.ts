import { guardarColeccion, leerColeccion } from '../../_lib/almacen'
import { ahora, conSesion, cuerpoJson, error, idNuevo, json, type Env } from '../../_lib/entorno'
import { registrarEvento } from '../../_lib/historial'

interface Marca {
  id: string
  nombre: string
  propietarioId: string | null
  esSistema: boolean
  [clave: string]: unknown
}

const COLECCION = 'marcas'

/** Cada usuario ve sus marcas; el administrador ve todas. */
function visiblePara(marca: Marca, uid: string, rol: string): boolean {
  return rol === 'admin' || marca.propietarioId === uid || marca.propietarioId === null
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const marcas = await leerColeccion<Marca>(env, COLECCION)
    return json({ marcas: marcas.filter((m) => visiblePara(m, sesion.uid, sesion.rol)) })
  })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const entrada = await cuerpoJson<Partial<Marca>>(request)
    if (!entrada.nombre || !String(entrada.nombre).trim()) {
      return error('La marca necesita un nombre.', 422)
    }

    const marcas = await leerColeccion<Marca>(env, COLECCION)
    const existente = entrada.id ? marcas.find((m) => m.id === entrada.id) : undefined

    if (existente && !visiblePara(existente, sesion.uid, sesion.rol)) {
      return error('No puedes modificar una marca de otro usuario.', 403)
    }
    if (existente?.esSistema && sesion.rol !== 'admin') {
      return error('Las marcas del sistema sólo las edita el administrador.', 403)
    }

    const marca: Marca = {
      ...(existente ?? {}),
      ...entrada,
      id: existente?.id ?? entrada.id ?? idNuevo('marca'),
      propietarioId: existente?.propietarioId ?? sesion.uid,
      esSistema: existente?.esSistema ?? false,
      nombre: String(entrada.nombre).trim(),
      creadoEn: (existente?.creadoEn as string) ?? ahora(),
      actualizadoEn: ahora(),
    }

    await guardarColeccion(
      env,
      COLECCION,
      [...marcas.filter((m) => m.id !== marca.id), marca],
    )

    if (!existente) {
      await registrarEvento(env, {
        usuarioId: sesion.uid,
        usuarioEmail: sesion.email,
        tipo: 'marca_creada',
        detalle: `Creó la marca ${marca.nombre}`,
      })
    }
    return json({ marca }, { status: existente ? 200 : 201 })
  })
