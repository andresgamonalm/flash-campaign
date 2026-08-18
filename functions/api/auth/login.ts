import { verificarHash } from '../../../shared/passwords'
import { crearCookieSesion, cuerpoJson, error, json, type Env } from '../../_lib/entorno'
import { buscarPorEmail, usuarioPublico } from '../../_lib/usuarios'
import { registrarEvento } from '../../_lib/historial'

interface Credenciales {
  email?: string
  clave?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let datos: Credenciales
  try {
    datos = await cuerpoJson<Credenciales>(request)
  } catch (e) {
    return error((e as Error).message)
  }

  const email = (datos.email ?? '').trim()
  const clave = datos.clave ?? ''
  if (!email || !clave) return error('Escribe tu correo y tu contraseña para continuar.', 422)

  const usuario = await buscarPorEmail(env, email)
  // Mismo mensaje para usuario inexistente y clave incorrecta: no se revela
  // qué correos existen en el aplicativo.
  const generico = 'El correo o la contraseña no coinciden.'
  if (!usuario) return error(generico, 401)
  if (!usuario.activo) return error('Tu cuenta está deshabilitada. Escribe al administrador.', 403)
  if (!(await verificarHash(clave, usuario.hash))) return error(generico, 401)

  const cookie = await crearCookieSesion(
    { uid: usuario.id, email: usuario.email, rol: usuario.rol },
    env,
    new URL(request.url),
  )
  await registrarEvento(env, {
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    tipo: 'sesion_iniciada',
    detalle: 'Inicio de sesión',
  })
  return json({ usuario: usuarioPublico(usuario) }, { headers: { 'set-cookie': cookie } })
}
