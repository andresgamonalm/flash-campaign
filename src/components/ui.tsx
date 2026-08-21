import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { Icono, type NombreIcono } from './Icono'

/* ------------------------------------------------------------------ Botón */

type Variante = 'principal' | 'secundario' | 'alterno' | 'terciario' | 'peligro' | 'sobre-azul'

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  icono?: NombreIcono
  cargando?: boolean
  bloque?: boolean
  pequeno?: boolean
}

export function Boton({
  variante = 'principal',
  icono,
  cargando = false,
  bloque = false,
  pequeno = false,
  children,
  className = '',
  disabled,
  ...resto
}: PropsBoton) {
  // Un botón sin texto necesita área táctil propia: no puede quedar más angosto
  // que su icono.
  const soloIcono = Boolean(icono) && (children === undefined || children === null || children === false)

  return (
    <button
      type="button"
      className={`btn btn--${variante}${bloque ? ' btn--bloque' : ''}${pequeno ? ' btn--sm' : ''}${
        soloIcono ? ' btn--icono' : ''
      } ${className}`.trim()}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? <span className="btn__spinner" aria-hidden="true" /> : icono ? <Icono nombre={icono} tamano={pequeno ? 16 : 18} /> : null}
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------- Campos */

interface PropsCampo {
  etiqueta: string
  ayuda?: string
  error?: string
  requerido?: boolean
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
}

export function Campo({ etiqueta, ayuda, error, requerido, children }: PropsCampo) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const descritoPor = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="campo">
      <label className="campo__label" htmlFor={id}>
        {etiqueta}
        {requerido ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({ id, 'aria-describedby': descritoPor, 'aria-invalid': error ? true : undefined })}
      {ayuda ? (
        <span className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </span>
      ) : null}
      {error ? (
        <span className="campo__error" id={idError} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

/* ----------------------------------------------------------------- Avisos */

export function Aviso({
  tipo = 'info',
  titulo,
  children,
  accion,
}: {
  tipo?: 'info' | 'exito' | 'alerta' | 'error'
  titulo?: string
  children: ReactNode
  accion?: ReactNode
}) {
  const iconos: Record<string, NombreIcono> = { info: 'info', exito: 'check', alerta: 'alerta', error: 'error' }
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono nombre={iconos[tipo]} tamano={20} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {titulo ? <strong>{titulo}</strong> : null}
        <div>{children}</div>
        {accion}
      </div>
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando" role="status">
      <span className="btn__spinner" aria-hidden="true" />
      {texto}
    </div>
  )
}

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string
  descripcion: string
  accion?: ReactNode
}) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      <p style={{ color: 'var(--txt-suave)', maxWidth: '60ch' }}>{descripcion}</p>
      {accion}
    </div>
  )
}

/* ---------------------------------------------------------------- Tostadas */

interface Tostada {
  id: number
  texto: string
  tipo: 'info' | 'exito' | 'error' | 'alerta'
}

const ContextoTostadas = createContext<(texto: string, tipo?: Tostada['tipo']) => void>(() => undefined)

export function ProveedorTostadas({ children }: { children: ReactNode }) {
  const [tostadas, setTostadas] = useState<Tostada[]>([])
  const contador = useRef(0)

  const avisar = useCallback((texto: string, tipo: Tostada['tipo'] = 'info') => {
    contador.current += 1
    const id = contador.current
    setTostadas((previas) => [...previas, { id, texto, tipo }])
    setTimeout(() => setTostadas((previas) => previas.filter((t) => t.id !== id)), 5200)
  }, [])

  return (
    <ContextoTostadas.Provider value={avisar}>
      {children}
      <div className="tostadas" aria-live="polite" aria-atomic="false">
        {tostadas.map((t) => (
          <div key={t.id} className={`tostada tostada--${t.tipo}`} role={t.tipo === 'error' ? 'alert' : 'status'}>
            {t.texto}
          </div>
        ))}
      </div>
    </ContextoTostadas.Provider>
  )
}

export function useAvisar() {
  return useContext(ContextoTostadas)
}

/* ----------------------------------------------------------------- Modal */

export function Modal({
  titulo,
  descripcion,
  children,
  pie,
  onCerrar,
  ancho = false,
}: {
  titulo: string
  descripcion?: string
  children: ReactNode
  pie?: ReactNode
  onCerrar: () => void
  ancho?: boolean
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const tituloId = useId()

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const foco = contenedor.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    )
    foco?.focus()

    function alPulsar(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.stopPropagation()
        onCerrar()
        return
      }
      if (ev.key !== 'Tab' || !contenedor.current) return
      const focos = [
        ...contenedor.current.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null)
      if (!focos.length) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      if (ev.shiftKey && document.activeElement === primero) {
        ev.preventDefault()
        ultimo.focus()
      } else if (!ev.shiftKey && document.activeElement === ultimo) {
        ev.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPulsar, true)
    return () => {
      document.removeEventListener('keydown', alPulsar, true)
      anterior?.focus?.()
    }
  }, [onCerrar])

  return (
    <div
      className="modal-fondo"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onCerrar()
      }}
    >
      <div
        className={`modal${ancho ? ' modal--ancho' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={contenedor}
      >
        <div className="modal__cabecera">
          <div>
            <h2 id={tituloId}>{titulo}</h2>
            {descripcion ? <p style={{ color: 'var(--txt-suave)', fontSize: 'var(--t-sm)' }}>{descripcion}</p> : null}
          </div>
          <Boton variante="terciario" onClick={onCerrar} aria-label="Cerrar" icono="cerrar" />
        </div>
        {children}
        {pie ? <div className="modal__pie">{pie}</div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Tabs */

export function Tabs<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { id: T; nombre: string }[]
  valor: T
  onCambio: (id: T) => void
  etiqueta: string
}) {
  return (
    <div className="tabs" role="tablist" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          className="tabs__item"
          aria-selected={valor === o.id}
          onClick={() => onCambio(o.id)}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------ Confirmación */

export function useConfirmacion() {
  const [peticion, setPeticion] = useState<{
    titulo: string
    mensaje: string
    textoConfirmar: string
    resolver: (ok: boolean) => void
  } | null>(null)

  const confirmar = useCallback(
    (titulo: string, mensaje: string, textoConfirmar = 'Confirmar') =>
      new Promise<boolean>((resolver) => setPeticion({ titulo, mensaje, textoConfirmar, resolver })),
    [],
  )

  const dialogo = peticion ? (
    <Modal
      titulo={peticion.titulo}
      onCerrar={() => {
        peticion.resolver(false)
        setPeticion(null)
      }}
      pie={
        <>
          <Boton
            variante="secundario"
            onClick={() => {
              peticion.resolver(false)
              setPeticion(null)
            }}
          >
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            onClick={() => {
              peticion.resolver(true)
              setPeticion(null)
            }}
          >
            {peticion.textoConfirmar}
          </Boton>
        </>
      }
    >
      <p>{peticion.mensaje}</p>
    </Modal>
  ) : null

  return useMemo(() => ({ confirmar, dialogo }), [confirmar, dialogo])
}

/**
 * Sección plegable.
 *
 * Un panel de propiedades con todo abierto obliga a recorrer una columna larga
 * para llegar a lo de siempre. Plegando lo que se consulta de vez en cuando
 * —coordenadas, enlace, fondo— lo frecuente queda a la vista sin desplazarse.
 *
 * Se usa `details`/`summary` del navegador: recuerda el estado abierto,
 * funciona con teclado y lo anuncian los lectores de pantalla sin código extra.
 */
export function Plegable({
  titulo,
  abierto = false,
  children,
}: {
  titulo: string
  abierto?: boolean
  children: React.ReactNode
}) {
  return (
    <details className="plegable" open={abierto}>
      <summary className="plegable__titulo">
        <span>{titulo}</span>
        <Icono nombre="abajo" tamano={16} />
      </summary>
      <div className="plegable__cuerpo">{children}</div>
    </details>
  )
}
