import { verificarHash } from '../../../shared/passwords'
import { crearCookieSesion, cuerpoJson, error, json, type Env } from '../../_lib/entorno'
import { buscarPorEmail, usuarioPublico } from '../../_lib/usuarios'
import { registrarEvento } from '../../_lib/historial'

interface Credenciales {
  email?: string
  clave?: string
}

/**
 * Marca en qué paso va la petición.
 *
 * Cuando una función de Cloudflare lanza una excepción sin capturar, la
 * plataforma responde un 500 sin cuerpo y no hay forma de saber qué falló desde
 * fuera. Anotando el paso actual, el manejador puede decir exactamente dónde
 * murió en vez de dejar al usuario con un número.
 */
type Paso = 'leer petición' | 'buscar la cuenta' | 'comprobar la contraseña' | 'firmar la sesión' | 'responder'

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  let paso: Paso = 'leer petición'
  try {
    let datos: Credenciales
    try {
      datos = await cuerpoJson<Credenciales>(request)
    } catch (e) {
      return error((e as Error).message)
    }

    const email = (datos.email ?? '').trim()
    const clave = datos.clave ?? ''
    if (!email || !clave) return error('Escribe tu correo y tu contraseña para continuar.', 422)

    // Mismo mensaje para usuario inexistente y clave incorrecta: no se revela
    // qué correos existen en el aplicativo.
    const generico = 'El correo o la contraseña no coinciden.'

    paso = 'buscar la cuenta'
    const usuario = await buscarPorEmail(env, email)
    if (!usuario) return error(generico, 401)
    if (!usuario.activo) return error('Tu cuenta está deshabilitada. Escribe al administrador.', 403)

    paso = 'comprobar la contraseña'
    if (!(await verificarHash(clave, usuario.hash))) return error(generico, 401)

    paso = 'firmar la sesión'
    const cookie = await crearCookieSesion(
      { uid: usuario.id, email: usuario.email, rol: usuario.rol },
      env,
      new URL(request.url),
    )

    paso = 'responder'
    const respuesta = json({ usuario: usuarioPublico(usuario) }, { headers: { 'set-cookie': cookie } })

    // El historial es una bitácora, no un requisito para entrar: se escribe
    // fuera del camino crítico, con la respuesta ya resuelta, para que ni su
    // demora ni su fallo puedan impedir el acceso.
    waitUntil(
      registrarEvento(env, {
        usuarioId: usuario.id,
        usuarioEmail: usuario.email,
        tipo: 'sesion_iniciada',
        detalle: 'Inicio de sesión',
      }).catch(() => undefined),
    )

    return respuesta
  } catch (e) {
    // Cualquier fallo inesperado sale como mensaje legible, no como un 500 mudo.
    return error(`Falló al ${paso}: ${(e as Error)?.message ?? 'error desconocido'}`, 500)
  }
}
