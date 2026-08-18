import { conSesion, cuerpoJson, error, json, type Env } from '../../_lib/entorno'
import { buscarPorId, guardarUsuario, usuarioPublico } from '../../_lib/usuarios'

interface Perfil {
  nombre?: string
  correoContacto?: string
  zonaHoraria?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const datos = await cuerpoJson<Perfil>(request)
    const usuario = await buscarPorId(env, sesion.uid)
    if (!usuario) return error('No se encontró la cuenta.', 404)

    const correo = datos.correoContacto?.trim()
    if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      return error('El correo de contacto no tiene un formato válido.', 422)
    }

    const actualizado = {
      ...usuario,
      nombre: datos.nombre?.trim() || usuario.nombre,
      correoContacto: correo ?? usuario.correoContacto,
      zonaHoraria: datos.zonaHoraria || usuario.zonaHoraria,
    }
    await guardarUsuario(env, actualizado)
    return json({ usuario: usuarioPublico(actualizado) })
  })
