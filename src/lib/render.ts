import type { Banner, Elemento, ElementoTexto, Fondo, PresetFiltro } from './types'

/** Dibujado del banner. La misma función alimenta miniaturas, vista previa y export JPG. */

export interface OpcionesRender {
  escala?: number
  imagenes: Map<string, HTMLImageElement>
}

const cache = new Map<string, HTMLImageElement>()

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  const existente = cache.get(src)
  if (existente && existente.complete && existente.naturalWidth > 0) return Promise.resolve(existente)
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Necesario para que el canvas no quede contaminado al exportar en JPG.
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => {
      cache.set(src, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`))
    img.src = src
  })
}

/** Precarga todas las imágenes que necesita un conjunto de banners. */
export async function precargarImagenes(banners: Banner[]): Promise<Map<string, HTMLImageElement>> {
  const fuentes = new Set<string>()
  for (const b of banners) {
    if (b.fondo.tipo === 'imagen' && b.fondo.imagenSrc) fuentes.add(b.fondo.imagenSrc)
    for (const el of b.elementos) {
      if ((el.tipo === 'imagen' || el.tipo === 'logo') && el.src) fuentes.add(el.src)
    }
  }
  const mapa = new Map<string, HTMLImageElement>()
  await Promise.all(
    [...fuentes].map(async (src) => {
      try {
        mapa.set(src, await cargarImagen(src))
      } catch {
        /* Una imagen ausente no debe frenar la exportación del resto. */
      }
    }),
  )
  return mapa
}

export function filtroCss(filtro: Fondo['filtro']): string {
  const i = Math.max(0, Math.min(100, filtro.intensidad)) / 100
  switch (filtro.preset) {
    case 'blanco_negro':
      return `grayscale(${i * 100}%)`
    case 'oscurecer':
      return `brightness(${1 - i * 0.6})`
    case 'aclarar':
      return `brightness(${1 + i * 0.55})`
    case 'contraste':
      return `contrast(${1 + i * 0.8})`
    case 'calido':
      return `sepia(${i * 65}%) saturate(${1 + i * 0.35})`
    case 'frio':
      return `saturate(${1 + i * 0.5}) hue-rotate(${i * -18}deg)`
    case 'desenfoque':
      return `blur(${(i * 8).toFixed(2)}px)`
    default:
      return 'none'
  }
}

export const FILTROS: { id: PresetFiltro; nombre: string }[] = [
  { id: 'ninguno', nombre: 'Sin filtro' },
  { id: 'blanco_negro', nombre: 'Blanco y negro' },
  { id: 'oscurecer', nombre: 'Oscurecer' },
  { id: 'aclarar', nombre: 'Aclarar' },
  { id: 'contraste', nombre: 'Más contraste' },
  { id: 'calido', nombre: 'Cálido' },
  { id: 'frio', nombre: 'Frío' },
  { id: 'desenfoque', nombre: 'Desenfoque' },
  { id: 'tinte_marca', nombre: 'Tinte de marca' },
]

function rutaRedondeada(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radio = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radio, y)
  ctx.lineTo(x + w - radio, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radio)
  ctx.lineTo(x + w, y + h - radio)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radio, y + h)
  ctx.lineTo(x + radio, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radio)
  ctx.lineTo(x, y + radio)
  ctx.quadraticCurveTo(x, y, x + radio, y)
  ctx.closePath()
}

function dibujarImagenAjustada(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  ajuste: 'cover' | 'contain',
  foco: { x: number; y: number } = { x: 0.5, y: 0.5 },
) {
  const rc = img.naturalWidth / img.naturalHeight
  const rd = w / h
  let dw = w
  let dh = h
  if (ajuste === 'cover' ? rc > rd : rc < rd) {
    dh = ajuste === 'cover' ? h : w / rc
    dw = ajuste === 'cover' ? h * rc : w
  } else {
    dw = ajuste === 'cover' ? w : h * rc
    dh = ajuste === 'cover' ? w / rc : h
  }
  const dx = x + (w - dw) * (ajuste === 'cover' ? foco.x : 0.5)
  const dy = y + (h - dh) * (ajuste === 'cover' ? foco.y : 0.5)
  ctx.drawImage(img, dx, dy, dw, dh)
}

export function medirLineas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  anchoMax: number,
): string[] {
  const lineas: string[] = []
  for (const parrafo of texto.split('\n')) {
    if (!parrafo) {
      lineas.push('')
      continue
    }
    let actual = ''
    for (const palabra of parrafo.split(/\s+/)) {
      const tentativa = actual ? `${actual} ${palabra}` : palabra
      if (ctx.measureText(tentativa).width <= anchoMax || !actual) {
        actual = tentativa
      } else {
        lineas.push(actual)
        actual = palabra
      }
    }
    lineas.push(actual)
  }
  return lineas
}

export function fuenteCss(el: ElementoTexto, tamano = el.tamano): string {
  return `${el.peso} ${tamano}px ${el.fuente}`
}

function dibujarTexto(ctx: CanvasRenderingContext2D, el: ElementoTexto) {
  const anchoCaja = el.w - el.margen.izquierda - el.margen.derecha
  const altoCaja = el.h - el.margen.arriba - el.margen.abajo
  if (anchoCaja <= 0 || altoCaja <= 0) return

  let tamano = el.tamano
  ctx.font = fuenteCss(el, tamano)
  let lineas = medirLineas(ctx, el.texto, anchoCaja)

  if (el.autoAjuste) {
    let intentos = 0
    while (
      intentos < 40 &&
      tamano > 6 &&
      (lineas.length * tamano * el.interlineado > altoCaja ||
        lineas.some((l) => ctx.measureText(l).width > anchoCaja))
    ) {
      tamano -= 1
      ctx.font = fuenteCss(el, tamano)
      lineas = medirLineas(ctx, el.texto, anchoCaja)
      intentos += 1
    }
  }

  const alturaTexto = lineas.length * tamano * el.interlineado
  let y = el.y + el.margen.arriba
  if (el.alineacionVertical === 'centro') y += Math.max(0, (altoCaja - alturaTexto) / 2)
  else if (el.alineacionVertical === 'abajo') y += Math.max(0, altoCaja - alturaTexto)

  ctx.fillStyle = el.color
  ctx.textBaseline = 'top'
  ctx.textAlign = el.alineacion === 'izquierda' ? 'left' : el.alineacion === 'derecha' ? 'right' : 'center'
  const x =
    el.alineacion === 'izquierda'
      ? el.x + el.margen.izquierda
      : el.alineacion === 'derecha'
        ? el.x + el.w - el.margen.derecha
        : el.x + el.margen.izquierda + anchoCaja / 2

  const desplazamiento = (tamano * el.interlineado - tamano) / 2
  lineas.forEach((linea, i) => {
    ctx.fillText(linea, x, y + i * tamano * el.interlineado + desplazamiento)
  })
}

function dibujarElemento(ctx: CanvasRenderingContext2D, el: Elemento, imagenes: Map<string, HTMLImageElement>) {
  ctx.save()
  switch (el.tipo) {
    case 'rectangulo': {
      rutaRedondeada(ctx, el.x, el.y, el.w, el.h, el.radio)
      if (el.relleno !== 'transparent') {
        ctx.fillStyle = el.relleno
        ctx.fill()
      }
      if (el.grosorBorde > 0) {
        ctx.strokeStyle = el.borde
        ctx.lineWidth = el.grosorBorde
        ctx.stroke()
      }
      break
    }
    case 'circulo': {
      ctx.beginPath()
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.max(el.w / 2, 0.5), Math.max(el.h / 2, 0.5), 0, 0, Math.PI * 2)
      if (el.relleno !== 'transparent') {
        ctx.fillStyle = el.relleno
        ctx.fill()
      }
      if (el.grosorBorde > 0) {
        ctx.strokeStyle = el.borde
        ctx.lineWidth = el.grosorBorde
        ctx.stroke()
      }
      break
    }
    case 'texto': {
      if (el.fondo && el.fondo !== 'transparent') {
        rutaRedondeada(ctx, el.x, el.y, el.w, el.h, el.radio)
        ctx.fillStyle = el.fondo
        ctx.fill()
      }
      dibujarTexto(ctx, el)
      break
    }
    case 'imagen':
    case 'logo': {
      const img = imagenes.get(el.src)
      if (img) {
        if (el.radio > 0) {
          rutaRedondeada(ctx, el.x, el.y, el.w, el.h, el.radio)
          ctx.clip()
        }
        dibujarImagenAjustada(ctx, img, el.x, el.y, el.w, el.h, el.ajuste === 'cover' ? 'cover' : 'contain')
      }
      break
    }
  }
  ctx.restore()
}

export function dibujarBanner(ctx: CanvasRenderingContext2D, banner: Banner, opciones: OpcionesRender) {
  const escala = opciones.escala ?? 1
  ctx.save()
  ctx.scale(escala, escala)
  ctx.clearRect(0, 0, banner.ancho, banner.alto)

  // Fondo
  ctx.save()
  ctx.fillStyle = banner.fondo.color || '#ffffff'
  ctx.fillRect(0, 0, banner.ancho, banner.alto)
  if (banner.fondo.tipo === 'imagen' && banner.fondo.imagenSrc) {
    const img = opciones.imagenes.get(banner.fondo.imagenSrc)
    if (img) {
      const css = filtroCss(banner.fondo.filtro)
      if (css !== 'none') ctx.filter = css
      dibujarImagenAjustada(ctx, img, 0, 0, banner.ancho, banner.alto, banner.fondo.ajuste, banner.fondo.foco)
      ctx.filter = 'none'
    }
  }
  if (banner.fondo.filtro.preset === 'tinte_marca' && banner.fondo.tipo === 'imagen') {
    ctx.globalAlpha = Math.max(0, Math.min(100, banner.fondo.filtro.intensidad)) / 100
    ctx.fillStyle = banner.fondo.filtro.color || '#040764'
    ctx.fillRect(0, 0, banner.ancho, banner.alto)
    ctx.globalAlpha = 1
  }
  ctx.restore()

  for (const el of [...banner.elementos].sort((a, b) => a.z - b.z)) {
    dibujarElemento(ctx, el, opciones.imagenes)
  }
  ctx.restore()
}

export async function bannerACanvas(banner: Banner, escala = 1): Promise<HTMLCanvasElement> {
  const imagenes = await precargarImagenes([banner])
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(banner.ancho * escala)
  canvas.height = Math.round(banner.alto * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('El navegador no entregó contexto 2D para exportar el banner.')
  dibujarBanner(ctx, banner, { escala, imagenes })
  return canvas
}

export async function bannerAJpg(banner: Banner, calidad = 0.92, escala = 1): Promise<Blob> {
  const canvas = await bannerACanvas(banner, escala)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar el JPG.'))),
      'image/jpeg',
      calidad,
    )
  })
}
