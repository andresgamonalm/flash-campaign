import { useEffect, useRef } from 'react'
import { dibujarBanner, precargarImagenes } from '../lib/render'
import type { Banner } from '../lib/types'

interface Props {
  banner: Banner
  ancho: number
  alto: number
  borde?: boolean
}

/** Miniatura fiel: usa el mismo renderizador que la exportación. */
export function MiniaturaBanner({ banner, ancho, alto, borde = false }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let vivo = true
    async function pintar() {
      const lienzo = canvas.current
      if (!lienzo) return
      const escala = Math.min(ancho / banner.ancho, alto / banner.alto)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const imagenes = await precargarImagenes([banner])
      if (!vivo) return
      lienzo.width = Math.max(1, Math.round(banner.ancho * escala * dpr))
      lienzo.height = Math.max(1, Math.round(banner.alto * escala * dpr))
      lienzo.style.width = `${Math.round(banner.ancho * escala)}px`
      lienzo.style.height = `${Math.round(banner.alto * escala)}px`
      const ctx = lienzo.getContext('2d')
      if (!ctx) return
      dibujarBanner(ctx, banner, { escala: escala * dpr, imagenes })
    }
    void pintar()
    return () => {
      vivo = false
    }
  }, [banner, ancho, alto])

  return (
    <canvas
      ref={canvas}
      className={`miniatura-banner${borde ? ' miniatura-banner--borde' : ''}`}
      role="img"
      aria-label={`Vista del banner de ${banner.ancho} por ${banner.alto} píxeles`}
    />
  )
}
