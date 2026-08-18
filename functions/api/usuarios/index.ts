import { crearHash, validarClave } from '../../../shared/passwords'
import { ahora, conAdmin, cuerpoJson, error, idNuevo, json, type Env } from '../../_lib/entorno'
import { buscarPorEmail, guardarUsuario, listarUsuarios, usuarioPublico } from '../../_lib/usuarios'
import { registrarEvento } from '../../_lib/historial'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  conAdmin(request, env, async () => {
    const usuarios = await listarUsuarios(env)
    return json({ usuarios: usuarios.map(usuarioPublico) })
  })

interface NuevoUsuario {
  email?: string
  nombre?: string
  rol?: 'admin' | 'usuario'
  clave?: string
  zonaHoraria?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) =>
  conAdmin(request, env, async (sesion) => {
    const datos = await cuerpoJson<NuevoUsuario>(request)
    const email = (datos.email ?? '').trim().toLowerCase()
    const nombre = (datos.nombre ?? '').trim()
    const clave = datos.clave ?? ''

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return error('Escribe un correo válido.', 422)
    if (!nombre) return error('Escribe el nombre de la persona.', 422)
    const problema = validarClave(clave)
    if (problema) return error(problema, 422)
    if (await buscarPorEmail(env, email)) return error('Ya existe una cuenta con ese correo.', 409)

    const usuario = {
      id: idNuevo('usr'),
      email,
      nombre,
      rol: datos.rol === 'admin' ? ('admin' as const) : ('usuario' as const),
      activo: true,
      zonaHoraria: datos.zonaHoraria || 'America/Santiago',
      correoContacto: email,
      creadoEn: ahora(),
      hash: await crearHash(clave),
    }
    await guardarUsuario(env, usuario)
    await registrarEvento(env, {
      usuarioId: sesion.uid,
      usuarioEmail: sesion.email,
      tipo: 'usuario_creado',
      detalle: `Creó la cuenta ${email} con rol ${usuario.rol}`,
    })
    return json({ usuario: usuarioPublico(usuario) }, { status: 201 })
  })
