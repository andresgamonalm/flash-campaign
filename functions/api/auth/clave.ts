import { crearHash, validarClave, verificarHash } from '../../../shared/passwords'
import { conSesion, cuerpoJson, error, json, type Env } from '../../_lib/entorno'
import { buscarPorId, guardarUsuario } from '../../_lib/usuarios'

interface Cambio {
  claveActual?: string
  claveNueva?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const datos = await cuerpoJson<Cambio>(request)
    const actual = datos.claveActual ?? ''
    const nueva = datos.claveNueva ?? ''

    const problema = validarClave(nueva)
    if (problema) return error(problema, 422)

    const usuario = await buscarPorId(env, sesion.uid)
    if (!usuario) return error('No se encontró la cuenta.', 404)
    if (!(await verificarHash(actual, usuario.hash))) return error('La contraseña actual no coincide.', 401)

    await guardarUsuario(env, { ...usuario, hash: await crearHash(nueva) })
    return json({ ok: true })
  })
