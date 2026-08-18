import { leerColeccion, guardarColeccion } from './almacen'
import { USUARIOS_SEMILLA, type Env, type UsuarioAlmacenado } from './entorno'

/**
 * Los usuarios nacen en `data/usuarios.json` (versionado en GitHub, como pide el
 * brief) y el administrador puede crear o modificar cuentas desde el aplicativo.
 * Esas modificaciones se guardan en KV y prevalecen sobre la semilla, de modo que
 * el archivo del repositorio nunca queda desactualizado ni hay que editarlo a mano.
 */

const COLECCION = 'usuarios'

export async function listarUsuarios(env: Env): Promise<UsuarioAlmacenado[]> {
  const guardados = await leerColeccion<UsuarioAlmacenado>(env, COLECCION)
  const porEmail = new Map<string, UsuarioAlmacenado>()
  for (const u of USUARIOS_SEMILLA) porEmail.set(u.email.toLowerCase(), u)
  for (const u of guardados) porEmail.set(u.email.toLowerCase(), u)
  return [...porEmail.values()].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
}

export async function buscarPorEmail(env: Env, email: string): Promise<UsuarioAlmacenado | undefined> {
  const lista = await listarUsuarios(env)
  return lista.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
}

export async function buscarPorId(env: Env, id: string): Promise<UsuarioAlmacenado | undefined> {
  const lista = await listarUsuarios(env)
  return lista.find((u) => u.id === id)
}

/** Escribe (crea o reemplaza) un usuario en la capa editable. */
export async function guardarUsuario(env: Env, usuario: UsuarioAlmacenado): Promise<void> {
  const guardados = await leerColeccion<UsuarioAlmacenado>(env, COLECCION)
  const restantes = guardados.filter((u) => u.id !== usuario.id)
  restantes.push(usuario)
  await guardarColeccion(env, COLECCION, restantes)
}

export function usuarioPublico(u: UsuarioAlmacenado) {
  const { hash: _hash, ...resto } = u
  return resto
}
