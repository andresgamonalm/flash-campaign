import { useCallback, useEffect, useRef, useState } from 'react'
import type { Banner, Elemento } from '../lib/types'
import { dibujarBanner, precargarImagenes } from '../lib/render'

/**
 * Superficie de edición.
 *
 * El banner se pinta con el mismo renderizador que produce el JPG, de modo que lo
 * que se ve es exactamente lo que se exporta. Encima va una capa transparente de
 * cajas para arrastrar, redimensionar y seleccionar con teclado.
 */

type Manija = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'

const MANIJAS_ESQUINA: Manija[] = ['nw', 'ne', 'sw', 'se']
const MANIJAS_LADO: Manija[] = ['n', 's', 'e', 'w']
const IMAN = 4

interface Props {
  banner: Banner
  escala: number
  seleccionadoId: string | null
  onSeleccionar: (id: string | null) => void
  onCambiar: (elemento: Elemento) => void
  onFinDeGesto?: () => void
  soloLectura?: boolean
}

interface Gesto {
  tipo: 'mover' | 'redimensionar'
  manija?: Manija
  inicioX: number
  inicioY: number
  original: Elemento
  proporcional: boolean
}

export function Lienzo({
  banner,
  escala,
  seleccionadoId,
  onSeleccionar,
  onCambiar,
  onFinDeGesto,
  soloLectura = false,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const gesto = useRef<Gesto | null>(null)
  // Contador de repintados: la carga de imágenes es asíncrona y sin este control
  // un repintado antiguo puede terminar después del actual y dibujar con la
  // escala equivocada.
  const version = useRef(0)
  const [guias, setGuias] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })

  const pintar = useCallback(async () => {
    const lienzo = canvas.current
    if (!lienzo) return
    version.current += 1
    const propia = version.current

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const imagenes = await precargarImagenes([banner])
    if (propia !== version.current) return

    lienzo.width = Math.round(banner.ancho * escala * dpr)
    lienzo.height = Math.round(banner.alto * escala * dpr)
    lienzo.style.width = `${banner.ancho * escala}px`
    lienzo.style.height = `${banner.alto * escala}px`
    const ctx = lienzo.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, lienzo.width, lienzo.height)
    dibujarBanner(ctx, banner, { escala: escala * dpr, imagenes })
  }, [banner, escala])

  useEffect(() => {
    void pintar()
  }, [pintar])

  const alMover = useCallback(
    (ev: PointerEvent) => {
      const actual = gesto.current
      if (!actual) return
      const dx = (ev.clientX - actual.inicioX) / escala
      const dy = (ev.clientY - actual.inicioY) / escala
      const o = actual.original

      if (actual.tipo === 'mover') {
        let x = o.x + dx
        let y = o.y + dy
        // Imán a los bordes y al centro del lienzo.
        const candidatosX = [0, banner.ancho / 2 - o.w / 2, banner.ancho - o.w]
        const candidatosY = [0, banner.alto / 2 - o.h / 2, banner.alto - o.h]
        let guiaX: number | null = null
        let guiaY: number | null = null
        for (const c of candidatosX) {
          if (Math.abs(x - c) < IMAN) {
            x = c
            guiaX = c === 0 ? 0 : c === banner.ancho - o.w ? banner.ancho : banner.ancho / 2
          }
        }
        for (const c of candidatosY) {
          if (Math.abs(y - c) < IMAN) {
            y = c
            guiaY = c === 0 ? 0 : c === banner.alto - o.h ? banner.alto : banner.alto / 2
          }
        }
        setGuias({ x: guiaX, y: guiaY })
        onCambiar({ ...o, x: redondear(x), y: redondear(y) })
        return
      }

      const manija = actual.manija ?? 'se'
      let { x, y, w, h } = o
      const proporcion = o.w / Math.max(o.h, 1)

      if (manija.includes('e')) w = o.w + dx
      if (manija.includes('s')) h = o.h + dy
      if (manija.includes('w')) {
        w = o.w - dx
        x = o.x + dx
      }
      if (manija.includes('n')) {
        h = o.h - dy
        y = o.y + dy
      }

      // Las esquinas mantienen la proporción, como pide el briefing.
      if (actual.proporcional && MANIJAS_ESQUINA.includes(manija)) {
        if (Math.abs(w - o.w) > Math.abs(h - o.h)) h = w / proporcion
        else w = h * proporcion
        if (manija.includes('w')) x = o.x + (o.w - w)
        if (manija.includes('n')) y = o.y + (o.h - h)
      }

      const min = 8
      if (w < min) {
        if (manija.includes('w')) x = o.x + o.w - min
        w = min
      }
      if (h < min) {
        if (manija.includes('n')) y = o.y + o.h - min
        h = min
      }

      onCambiar({ ...o, x: redondear(x), y: redondear(y), w: redondear(w), h: redondear(h) })
    },
    [banner.alto, banner.ancho, escala, onCambiar],
  )

  const alSoltar = useCallback(() => {
    if (!gesto.current) return
    gesto.current = null
    setGuias({ x: null, y: null })
    onFinDeGesto?.()
  }, [onFinDeGesto])

  useEffect(() => {
    window.addEventListener('pointermove', alMover)
    window.addEventListener('pointerup', alSoltar)
    window.addEventListener('pointercancel', alSoltar)
    return () => {
      window.removeEventListener('pointermove', alMover)
      window.removeEventListener('pointerup', alSoltar)
      window.removeEventListener('pointercancel', alSoltar)
    }
  }, [alMover, alSoltar])

  function iniciar(ev: React.PointerEvent, elemento: Elemento, tipo: Gesto['tipo'], manija?: Manija) {
    if (soloLectura || elemento.bloqueado) return
    ev.preventDefault()
    ev.stopPropagation()
    onSeleccionar(elemento.id)
    gesto.current = {
      tipo,
      manija,
      inicioX: ev.clientX,
      inicioY: ev.clientY,
      original: elemento,
      proporcional: !ev.altKey,
    }
  }

  function alTeclado(ev: React.KeyboardEvent, elemento: Elemento) {
    if (soloLectura || elemento.bloqueado) return
    const paso = ev.shiftKey ? 10 : 1
    const movimientos: Record<string, [number, number]> = {
      ArrowLeft: [-paso, 0],
      ArrowRight: [paso, 0],
      ArrowUp: [0, -paso],
      ArrowDown: [0, paso],
    }
    const delta = movimientos[ev.key]
    if (!delta) return
    ev.preventDefault()
    onCambiar({ ...elemento, x: redondear(elemento.x + delta[0]), y: redondear(elemento.y + delta[1]) })
    onFinDeGesto?.()
  }

  const ordenados = [...banner.elementos].sort((a, b) => a.z - b.z)

  return (
    <div
      className="lienzo"
      ref={contenedor}
      style={{ width: banner.ancho * escala, height: banner.alto * escala }}
      onPointerDown={(ev) => {
        // Basta con que el toque no caiga sobre un elemento para deseleccionar.
        // Comparar con el propio contenedor no servía: el lienzo está cubierto
        // por el canvas y por la capa de cajas, así que el clic en una zona
        // vacía nunca llegaba a tocar el marco y no se deseleccionaba nada.
        if (!(ev.target as HTMLElement).closest('.caja')) onSeleccionar(null)
      }}
    >
      <canvas ref={canvas} className="lienzo__canvas" aria-label={`Vista del banner ${banner.ancho} por ${banner.alto}`} />

      {guias.x !== null ? <div className="lienzo__guia lienzo__guia--v" style={{ left: guias.x * escala }} /> : null}
      {guias.y !== null ? <div className="lienzo__guia lienzo__guia--h" style={{ top: guias.y * escala }} /> : null}

      <div className="lienzo__capa">
        {ordenados.map((el) => {
          const activo = el.id === seleccionadoId
          return (
            <div
              key={el.id}
              className={`caja${activo ? ' caja--activa' : ''}${el.bloqueado ? ' caja--bloqueada' : ''}`}
              style={{
                left: el.x * escala,
                top: el.y * escala,
                width: el.w * escala,
                height: el.h * escala,
                zIndex: el.z,
              }}
              role="button"
              tabIndex={soloLectura ? -1 : 0}
              aria-label={`${el.nombre}. Posición ${Math.round(el.x)}, ${Math.round(el.y)}. Tamaño ${Math.round(el.w)} por ${Math.round(el.h)}.`}
              aria-pressed={activo}
              onPointerDown={(ev) => iniciar(ev, el, 'mover')}
              onFocus={() => onSeleccionar(el.id)}
              onKeyDown={(ev) => alTeclado(ev, el)}
            >
              {activo && !soloLectura && !el.bloqueado
                ? [...MANIJAS_ESQUINA, ...MANIJAS_LADO].map((m) => (
                    <span
                      key={m}
                      className={`manija manija--${m}`}
                      onPointerDown={(ev) => iniciar(ev, el, 'redimensionar', m)}
                    />
                  ))
                : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function redondear(v: number) {
  return Math.round(v * 10) / 10
}
