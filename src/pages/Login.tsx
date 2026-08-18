import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Aviso, Boton, Campo } from '../components/ui'
import { useSesion } from '../lib/sesion'
import { ErrorApi } from '../lib/api'
import { alFallarFoto, FOTO_LOGIN } from '../lib/recursos'

export function Login() {
  const { entrar } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    if (!email.trim() || !clave) {
      setError('Escribe tu correo y tu contraseña para entrar.')
      return
    }

    setEnviando(true)
    try {
      await entrar(email.trim(), clave)
      const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'
      navegar(destino, { replace: true })
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.status === 0
          ? 'No hay conexión con el servidor. Revisa tu red y vuelve a intentarlo.'
          : (e as Error).message,
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <section className="login__panel">
        <img src="/brand/flash-campaign/logo_flash_campaign.svg" alt="Flash Campaign" height={44} style={{ alignSelf: 'flex-start' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--e2)' }}>
          <h1>Entra a tu cuenta</h1>
          <p style={{ color: 'var(--txt-suave)', maxWidth: '46ch' }}>
            Arma anuncios de Google Search con el asistente Char B y produce todos los banners de Google Display y Meta
            desde un solo diseño.
          </p>
        </div>

        <form className="login__formulario" onSubmit={enviar} noValidate>
          {error ? <Aviso tipo="error">{error}</Aviso> : null}

          <Campo etiqueta="Correo" requerido>
            {(props) => (
              <input
                {...props}
                className="input"
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@dominio.cl"
              />
            )}
          </Campo>

          <Campo etiqueta="Contraseña" requerido>
            {(props) => (
              <input
                {...props}
                className="input"
                type="password"
                name="clave"
                autoComplete="current-password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
              />
            )}
          </Campo>

          <Boton type="submit" cargando={enviando} bloque>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Boton>

          <p style={{ fontSize: 'var(--t-xs)', color: 'var(--txt-suave)' }}>
            ¿Sin acceso? El administrador crea y habilita las cuentas desde la sección Usuarios.
          </p>
        </form>

        <div className="login__pie">
          <span>Desarrollado por</span>
          <img src="/brand/gamonal/logo_gamonal_azulino.png" alt="Gamonal" className="logo-endoso" />
        </div>
      </section>

      <section className="login__visual">
        <img className="login__foto" src={FOTO_LOGIN.rutaLocal} onError={alFallarFoto(FOTO_LOGIN)} alt={FOTO_LOGIN.alt} />
        <div className="login__mensaje">
          <h2>Un diseño, toda la campaña</h2>
          <p>
            Diseña el banner de 300 × 250 y Flash Campaign lo replica a los 14 formatos de Google Display y a los 5 de
            Meta, con reglas propias para las piezas horizontales y verticales.
          </p>
        </div>
      </section>
    </div>
  )
}
