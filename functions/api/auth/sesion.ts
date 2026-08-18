import { json, sesionDe, type Env } from '../../_lib/entorno'
import { buscarPorId, usuarioPublico } from '../../_lib/usuarios'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const sesion = await sesionDe(request, env)
  if (!sesion) return json({ usuario: null })
  const usuario = await buscarPorId(env, sesion.uid)
  if (!usuario || !usuario.activo) return json({ usuario: null })
  return json({ usuario: usuarioPublico(usuario) })
}
