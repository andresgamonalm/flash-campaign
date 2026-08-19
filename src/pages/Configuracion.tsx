import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Aviso, Boton, Campo, useAvisar } from '../components/ui'
import { Icono } from '../components/Icono'
import { api } from '../lib/api'
import { useSesion } from '../lib/sesion'
import { ZONAS_HORARIAS } from '../lib/formato'

export function Configuracion() {
  const { usuario, esAdmin, estadoServicio, actualizarUsuarioLocal, refrescar } = useSesion()
  const avisar = useAvisar()

  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [correoContacto, setCorreoContacto] = useState(usuario?.correoContacto ?? usuario?.email ?? '')
  const [zonaHoraria, setZonaHoraria] = useState(usuario?.zonaHoraria ?? 'America/Santiago')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveRepetida, setClaveRepetida] = useState('')
  const [errorClave, setErrorClave] = useState<string | null>(null)
  const [guardandoClave, setGuardandoClave] = useState(false)

  async function guardarPerfil(evento: React.FormEvent) {
    evento.preventDefault()
    setGuardandoPerfil(true)
    try {
      const { usuario: actualizado } = await api.actualizarPerfil({ nombre, correoContacto, zonaHoraria })
      actualizarUsuarioLocal(actualizado)
      avisar('Preferencias guardadas.', 'exito')
    } catch (e) {
      avisar((e as Error).message, 'error')
    } finally {
      setGuardandoPerfil(false)
    }
  }

  async function cambiarClave(evento: React.FormEvent) {
    evento.preventDefault()
    setErrorClave(null)

    if (claveNueva !== claveRepetida) {
      setErrorClave('La nueva contraseña y su repetición no coinciden.')
      return
    }

    setGuardandoClave(true)
    try {
      await api.cambiarClave(claveActual, claveNueva)
      setClaveActual('')
      setClaveNueva('')
      setClaveRepetida('')
      avisar('Contraseña actualizada.', 'exito')
    } catch (e) {
      setErrorClave((e as Error).message)
    } finally {
      setGuardandoClave(false)
    }
  }

  return (
    <div className="seccion" style={{ maxWidth: 1100 }}>
      <div className="seccion__cabecera">
        <div>
          <h2>Configuración</h2>
          <p style={{ color: 'var(--txt-suave)' }}>Tus datos de acceso, contacto y zona horaria.</p>
        </div>
      </div>

      <div className="rejilla rejilla--2">
        <form className="panel seccion" onSubmit={guardarPerfil}>
          <h3>Cuenta y preferencias</h3>

          <Campo etiqueta="Correo de acceso" ayuda="Sólo el administrador puede cambiar el correo de una cuenta.">
            {(props) => <input {...props} className="input" value={usuario?.email ?? ''} disabled />}
          </Campo>

          <Campo etiqueta="Nombre">
            {(props) => <input {...props} className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />}
          </Campo>

          <Campo etiqueta="Correo de contacto" ayuda="A dónde escribirte por temas de la cuenta.">
            {(props) => (
              <input
                {...props}
                className="input"
                type="email"
                value={correoContacto}
                onChange={(e) => setCorreoContacto(e.target.value)}
              />
            )}
          </Campo>

          <Campo etiqueta="Zona horaria" ayuda="Define cómo se muestran las horas del historial.">
            {(props) => (
              <select {...props} className="select" value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)}>
                {ZONAS_HORARIAS.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Boton type="submit" icono="guardar" cargando={guardandoPerfil}>
            Guardar preferencias
          </Boton>
        </form>

        <form className="panel seccion" onSubmit={cambiarClave}>
          <h3>Contraseña</h3>
          {errorClave ? <Aviso tipo="error">{errorClave}</Aviso> : null}

          <Campo etiqueta="Contraseña actual" requerido>
            {(props) => (
              <input
                {...props}
                className="input"
                type="password"
                autoComplete="current-password"
                value={claveActual}
                onChange={(e) => setClaveActual(e.target.value)}
              />
            )}
          </Campo>

          <Campo etiqueta="Nueva contraseña" requerido ayuda="Mínimo 8 caracteres, con al menos una letra y un número.">
            {(props) => (
              <input
                {...props}
                className="input"
                type="password"
                autoComplete="new-password"
                value={claveNueva}
                onChange={(e) => setClaveNueva(e.target.value)}
              />
            )}
          </Campo>

          <Campo etiqueta="Repite la nueva contraseña" requerido>
            {(props) => (
              <input
                {...props}
                className="input"
                type="password"
                autoComplete="new-password"
                value={claveRepetida}
                onChange={(e) => setClaveRepetida(e.target.value)}
              />
            )}
          </Campo>

          <Boton type="submit" icono="guardar" cargando={guardandoClave}>
            Cambiar contraseña
          </Boton>
        </form>
      </div>

      {esAdmin ? (
        <section className="panel seccion">
          <div className="seccion__cabecera">
            <div>
              <h3>Estado del despliegue</h3>
              <p style={{ color: 'var(--txt-suave)', fontSize: 'var(--t-sm)' }}>
                Qué está enlazado en Cloudflare y qué falta por configurar.
              </p>
            </div>
            <Boton variante="secundario" pequeno icono="historial" onClick={() => void refrescar()}>
              Actualizar
            </Boton>
          </div>

          {!estadoServicio ? (
            <Aviso tipo="error">No se pudo leer el estado del servicio.</Aviso>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla">
                <caption className="visually-hidden">Estado de la configuración</caption>
                <thead>
                  <tr>
                    <th scope="col">Servicio</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Qué significa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Almacenamiento de datos</th>
                    <td>
                      <span className={`chip ${estadoServicio.almacenamiento.persistente ? 'chip--exito' : 'chip--alerta'}`}>
                        {estadoServicio.almacenamiento.datos === 'd1'
                          ? `Base D1 como ${estadoServicio.almacenamiento.enlaceD1}`
                          : estadoServicio.almacenamiento.datos === 'kv'
                            ? `Espacio KV como ${estadoServicio.almacenamiento.enlaceKv}`
                            : 'Sin enlazar'}
                      </span>
                    </td>
                    <td>
                      {estadoServicio.almacenamiento.persistente
                        ? 'Proyectos, marcas, usuarios e historial se guardan de forma permanente.'
                        : 'Los datos viven en memoria y se pierden al reiniciar. Enlaza una base D1 como DB o un espacio KV como FLASH_KV.'}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Archivos de imagen</th>
                    <td>
                      <span className={`chip ${estadoServicio.almacenamiento.imagenes === 'memoria' ? 'chip--alerta' : 'chip--exito'}`}>
                        {estadoServicio.almacenamiento.imagenes === 'r2'
                          ? `Bucket R2 como ${estadoServicio.almacenamiento.enlaceR2}`
                          : estadoServicio.almacenamiento.imagenes.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {estadoServicio.almacenamiento.imagenes === 'r2'
                        ? 'Las subidas van al bucket R2 enlazado y el catálogo existente se lee directamente de él.'
                        : estadoServicio.almacenamiento.imagenes === 'memoria'
                          ? 'Las subidas no persisten. Enlaza un bucket R2 como IMAGENES.'
                          : 'Las subidas se guardan junto a los datos. Enlaza un bucket R2 como IMAGENES para archivos grandes.'}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Char B (Gemini)</th>
                    <td>
                      <span className={`chip ${estadoServicio.ia.configurada ? 'chip--exito' : 'chip--alerta'}`}>
                        {estadoServicio.ia.configurada ? 'Conectada' : 'Sin clave'}
                      </span>
                    </td>
                    <td>
                      {estadoServicio.ia.configurada
                        ? `Modelo en uso: ${estadoServicio.ia.modelo}.`
                        : 'Define la variable GEMINI_API_KEY en Cloudflare para generar anuncios de Search.'}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Secreto de sesión</th>
                    <td>
                      <span className={`chip ${estadoServicio.secretoSesion ? 'chip--exito' : 'chip--alerta'}`}>
                        {estadoServicio.secretoSesion ? 'Definido' : 'Derivado'}
                      </span>
                    </td>
                    <td>
                      {estadoServicio.secretoSesion
                        ? 'La cookie de sesión se firma con el secreto del proyecto (SESSION_SECRET o JWT_SECRET).'
                        : 'Define SESSION_SECRET o JWT_SECRET en Cloudflare para firmar las sesiones con un secreto propio.'}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Catálogo de imágenes de Cloudflare</th>
                    <td>
                      <span className={`chip ${estadoServicio.bibliotecaExterna ? 'chip--exito' : 'chip--info'}`}>
                        {estadoServicio.bibliotecaExterna ? 'Conectado' : 'No configurado'}
                      </span>
                    </td>
                    <td>
                      {estadoServicio.almacenamiento.enlaceR2
                        ? 'La biblioteca lista directamente las imágenes del bucket R2, sin necesidad de un manifiesto.'
                        : estadoServicio.bibliotecaExterna
                          ? 'La biblioteca muestra las imágenes del manifiesto configurado.'
                          : 'Enlaza el bucket R2 o define MEDIA_MANIFEST_URL para ver el catálogo existente.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: 'var(--t-sm)' }}>
            <Icono nombre="usuarios" tamano={16} /> Crea y habilita cuentas desde <Link to="/usuarios">Usuarios</Link>.
          </p>
        </section>
      ) : null}
    </div>
  )
}
