import { crearHash, validarClave } from '../../../shared/passwords'
import { conAdmin, cuerpoJson, error, json, type Env } from '../../_lib/entorno'
import { buscarPorId, guardarUsuario, usuarioPublico } from '../../_lib/usuarios'

interface Cambios {
  nombre?: string
  rol?: 'admin' | 'usuario'
  activo?: boolean
  zonaHoraria?: string
  claveNueva?: string
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) =>
  conAdmin(request, env, async (sesion) => {
    const id = String(params.id)
    const usuario = await buscarPorId(env, id)
    if (!usuario) return error('No se encontró la cuenta indicada.', 404)

    const datos = await cuerpoJson<Cambios>(request)

    // El administrador no puede dejarse a sí mismo sin acceso.
    if (usuario.id === sesion.uid && (datos.activo === false || datos.rol === 'usuario')) {
      return error('No puedes quitarte a ti mismo el acceso de administrador.', 409)
    }

    let hash = usuario.hash
    if (datos.claveNueva) {
      const problema = validarClave(datos.claveNueva)
      if (problema) return error(problema, 422)
      hash = await crearHash(datos.claveNueva)
    }

    const actualizado = {
      ...usuario,
      nombre: datos.nombre?.trim() || usuario.nombre,
      rol: datos.rol ?? usuario.rol,
      activo: datos.activo ?? usuario.activo,
      zonaHoraria: datos.zonaHoraria || usuario.zonaHoraria,
      hash,
    }
    await guardarUsuario(env, actualizado)
    return json({ usuario: usuarioPublico(actualizado) })
  })
