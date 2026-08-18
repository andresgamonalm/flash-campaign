import { useCallback, useEffect, useState } from 'react'
import { Aviso, Boton, Campo, Cargando, Modal, useAvisar } from '../components/ui'
import { api } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { fecha, ZONAS_HORARIAS } from '../lib/formato'
import type { Rol, Usuario } from '../lib/types'

interface Formulario {
  email: string
  nombre: string
  rol: Rol
  clave: string
  zonaHoraria: string
}

const VACIO: Formulario = {
  email: '',
  nombre: '',
  rol: 'usuario',
  clave: '',
  zonaHoraria: 'America/Santiago',
}

export function Usuarios() {
  const { usuario: propio } = useSesion()
  const avisar = useAvisar()

  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [formulario, setFormulario] = useState<Formulario>(VACIO)
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [restablecer, setRestablecer] = useState<{ usuario: Usuario; clave: string } | null>(null)

  const cargar = useCallback(async () => {
    try {
      const { usuarios: lista } = await api.listarUsuarios()
      setUsuarios(lista)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function crear() {
    setErrorFormulario(null)
    setGuardando(true)
    try {
      await api.crearUsuario(formulario)
      avisar(`Cuenta creada para ${formulario.email}.`, 'exito')
      setFormulario(VACIO)
      setCreando(false)
      await cargar()
    } catch (e) {
      setErrorFormulario((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  async function alternarActivo(usuario: Usuario) {
    try {
      await api.actualizarUsuario(usuario.id, { activo: !usuario.activo })
      avisar(usuario.activo ? 'Cuenta deshabilitada.' : 'Cuenta habilitada.', 'exito')
      await cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  async function cambiarRol(usuario: Usuario, rol: Rol) {
    try {
      await api.actualizarUsuario(usuario.id, { rol })
      avisar(`Rol actualizado a ${rol}.`, 'exito')
      await cargar()
    } catch (e) {
      avisar((e as Error).message, 'error')
    }
  }

  async function aplicarRestablecer() {
    if (!restablecer) return
    setGuardando(true)
    try {
      await api.actualizarUsuario(restablecer.usuario.id, { claveNueva: restablecer.clave })
      avisar('Contraseña restablecida. Entrégala por un canal seguro.', 'exito')
      setRestablecer(null)
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="seccion">
      <div className="seccion__cabecera">
        <div>
          <h2>Usuarios</h2>
          <p style={{ color: 'var(--txt-suave)' }}>
            Crea cuentas, habilítalas o deshabilítalas y restablece contraseñas. Cada usuario ve sólo sus campañas y sus
            imágenes.
          </p>
        </div>
        <Boton icono="mas" onClick={() => setCreando(true)}>
          Crear usuario
        </Boton>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <div className="panel">
        {!usuarios ? (
          <Cargando texto="Cargando cuentas…" />
        ) : (
          <div className="tabla-scroll">
            <table className="tabla">
              <caption className="visually-hidden">Cuentas del aplicativo</caption>
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Creada</th>
                  <th scope="col"><span className="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <th scope="row" style={{ fontWeight: 500, color: 'var(--txt-principal)' }}>
                      {u.nombre}
                      {u.id === propio?.id ? <span className="chip" style={{ marginLeft: 8 }}>Tú</span> : null}
                    </th>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="select"
                        value={u.rol}
                        onChange={(e) => cambiarRol(u, e.target.value as Rol)}
                        disabled={u.id === propio?.id}
                        aria-label={`Rol de ${u.nombre}`}
                        style={{ minWidth: 150 }}
                      >
                        <option value="usuario">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td>
                      <span className={`chip ${u.activo ? 'chip--exito' : 'chip--error'}`}>
                        {u.activo ? 'Habilitada' : 'Deshabilitada'}
                      </span>
                    </td>
                    <td>{fecha(u.creadoEn, propio?.zonaHoraria)}</td>
                    <td>
                      <div className="acciones-fila">
                        <Boton
                          variante="terciario"
                          pequeno
                          onClick={() => alternarActivo(u)}
                          disabled={u.id === propio?.id}
                        >
                          {u.activo ? 'Deshabilitar' : 'Habilitar'}
                        </Boton>
                        <Boton variante="terciario" pequeno onClick={() => setRestablecer({ usuario: u, clave: '' })}>
                          Restablecer clave
                        </Boton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creando ? (
        <Modal
          titulo="Crear usuario"
          descripcion="La persona podrá entrar de inmediato con el correo y la contraseña que definas."
          onCerrar={() => setCreando(false)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setCreando(false)}>
                Cancelar
              </Boton>
              <Boton icono="mas" cargando={guardando} onClick={crear}>
                Crear cuenta
              </Boton>
            </>
          }
        >
          {errorFormulario ? <Aviso tipo="error">{errorFormulario}</Aviso> : null}

          <Campo etiqueta="Correo" requerido>
            {(props) => (
              <input
                {...props}
                className="input"
                type="email"
                value={formulario.email}
                onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              />
            )}
          </Campo>

          <Campo etiqueta="Nombre" requerido>
            {(props) => (
              <input
                {...props}
                className="input"
                value={formulario.nombre}
                onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
              />
            )}
          </Campo>

          <Campo etiqueta="Contraseña inicial" requerido ayuda="Mínimo 8 caracteres, con al menos una letra y un número.">
            {(props) => (
              <input
                {...props}
                className="input"
                type="text"
                value={formulario.clave}
                onChange={(e) => setFormulario({ ...formulario, clave: e.target.value })}
              />
            )}
          </Campo>

          <div className="rejilla rejilla--2">
            <Campo etiqueta="Rol">
              {(props) => (
                <select
                  {...props}
                  className="select"
                  value={formulario.rol}
                  onChange={(e) => setFormulario({ ...formulario, rol: e.target.value as Rol })}
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              )}
            </Campo>
            <Campo etiqueta="Zona horaria">
              {(props) => (
                <select
                  {...props}
                  className="select"
                  value={formulario.zonaHoraria}
                  onChange={(e) => setFormulario({ ...formulario, zonaHoraria: e.target.value })}
                >
                  {ZONAS_HORARIAS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          </div>
        </Modal>
      ) : null}

      {restablecer ? (
        <Modal
          titulo={`Restablecer la contraseña de ${restablecer.usuario.nombre}`}
          descripcion="Define una contraseña temporal y entrégala por un canal seguro. La persona podrá cambiarla desde Configuración."
          onCerrar={() => setRestablecer(null)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setRestablecer(null)}>
                Cancelar
              </Boton>
              <Boton cargando={guardando} onClick={aplicarRestablecer}>
                Restablecer
              </Boton>
            </>
          }
        >
          <Campo etiqueta="Contraseña temporal" requerido ayuda="Mínimo 8 caracteres, con al menos una letra y un número.">
            {(props) => (
              <input
                {...props}
                className="input"
                type="text"
                value={restablecer.clave}
                onChange={(e) => setRestablecer({ ...restablecer, clave: e.target.value })}
              />
            )}
          </Campo>
        </Modal>
      ) : null}
    </div>
  )
}
