import type { Banner, Elemento, Fondo } from './types'
import type { Formato } from './formatos'
import { FORMATO_BASE } from './formatos'

/**
 * Reglas de replicación.
 *
 * El usuario diseña una sola vez el lienzo base de 300 × 250 y el sistema deriva
 * el resto de los formatos. Un escalado uniforme sirve para proporciones
 * parecidas, pero destruye la pieza en un leaderboard de 728 × 90 o en un
 * rascacielos de 160 × 600. Por eso hay tres modos:
 *
 * - `uniforme`: proporción parecida a la base. Escala geométrica y anclas
 *   conservadas (lo que estaba pegado a un borde sigue pegado a ese borde).
 * - `banda`: formatos muy horizontales. La lectura vertical de la base se
 *   convierte en lectura horizontal: lo que estaba arriba pasa a la izquierda,
 *   el centro al centro y lo de abajo a la derecha. Es la misma solución que usan
 *   las referencias de Zurich en 970 × 250 y 728 × 90.
 * - `columna`: formatos muy verticales. Se escala por ancho y el aire sobrante se
 *   reparte entre las filas, sin deformar ningún elemento.
 *
 * Todo lo que la regla resuelve es un punto de partida: cada formato queda
 * editable y, al tocarlo, se marca como ajustado manualmente para no pisarlo en
 * una nueva replicación.
 */

export type ModoReplicacion = 'uniforme' | 'banda' | 'columna'

const MARGEN_MIN = 6

export function modoPara(anchoDestino: number, altoDestino: number): ModoReplicacion {
  const proporcionBase = FORMATO_BASE.ancho / FORMATO_BASE.alto
  const proporcion = anchoDestino / altoDestino
  if (proporcion >= proporcionBase * 1.9) return 'banda'
  if (proporcion <= proporcionBase * 0.52) return 'columna'
  return 'uniforme'
}

export function descripcionModo(modo: ModoReplicacion): string {
  switch (modo) {
    case 'banda':
      return 'Banda horizontal: el orden de lectura vertical del lienzo base se distribuye de izquierda a derecha.'
    case 'columna':
      return 'Columna vertical: se escala por ancho y el espacio sobrante se reparte entre las filas.'
    default:
      return 'Escala uniforme: se conservan proporciones y anclas del lienzo base.'
  }
}

interface Caja {
  x: number
  y: number
  w: number
  h: number
}

function caja(el: Elemento): Caja {
  return { x: el.x, y: el.y, w: el.w, h: el.h }
}

function unir(cajas: Caja[]): Caja {
  const x0 = Math.min(...cajas.map((c) => c.x))
  const y0 = Math.min(...cajas.map((c) => c.y))
  const x1 = Math.max(...cajas.map((c) => c.x + c.w))
  const y1 = Math.max(...cajas.map((c) => c.y + c.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * Distingue el recurso gráfico que sangra a propósito (los círculos y semicírculos
 * que salen del lienzo) de un elemento que apenas se pasa unos píxeles. Un cuadro
 * de texto nunca se considera decoración: siempre es contenido que debe leerse.
 */
function sangra(el: Elemento, bw: number, bh: number): boolean {
  if (el.tipo === 'texto') return false
  const desbordeX = Math.max(0, -el.x) + Math.max(0, el.x + el.w - bw)
  const desbordeY = Math.max(0, -el.y) + Math.max(0, el.y + el.h - bh)
  return desbordeX > bw * 0.12 || desbordeY > bh * 0.12
}

function anclaH(el: Elemento, bw: number): 'izquierda' | 'centro' | 'derecha' {
  if (el.w >= bw * 0.92) return 'centro'
  const cx = el.x + el.w / 2
  if (cx < bw * 0.38) return 'izquierda'
  if (cx > bw * 0.62) return 'derecha'
  return 'centro'
}

function anclaV(el: Elemento, bh: number): 'arriba' | 'centro' | 'abajo' {
  if (el.h >= bh * 0.92) return 'centro'
  const cy = el.y + el.h / 2
  if (cy < bh * 0.38) return 'arriba'
  if (cy > bh * 0.62) return 'abajo'
  return 'centro'
}

function escalarElemento(el: Elemento, s: number): Elemento {
  const medidas = { w: el.w * s, h: el.h * s }
  switch (el.tipo) {
    case 'texto':
      return {
        ...el,
        ...medidas,
        tamano: Math.max(7, Math.round(el.tamano * s)),
        radio: Math.round(el.radio * s),
        margen: {
          arriba: el.margen.arriba * s,
          derecha: el.margen.derecha * s,
          abajo: el.margen.abajo * s,
          izquierda: el.margen.izquierda * s,
        },
      }
    case 'rectangulo':
    case 'circulo':
      return {
        ...el,
        ...medidas,
        radio: Math.round(el.radio * s),
        grosorBorde: el.grosorBorde > 0 ? Math.max(1, Math.round(el.grosorBorde * s)) : 0,
      }
    default:
      return { ...el, ...medidas, radio: Math.round(el.radio * s) }
  }
}

function limitar(el: Elemento, tw: number, th: number, forzar: boolean): Elemento {
  if (!forzar) return el
  const w = Math.min(el.w, tw - MARGEN_MIN)
  const h = Math.min(el.h, th - MARGEN_MIN)
  const x = Math.min(Math.max(el.x, MARGEN_MIN / 2), tw - w - MARGEN_MIN / 2)
  const y = Math.min(Math.max(el.y, MARGEN_MIN / 2), th - h - MARGEN_MIN / 2)
  return { ...el, x, y, w, h }
}

/** Escala geométrica acotada para que ningún elemento desborde el lienzo. */
function escalaUniforme(elementos: Elemento[], bw: number, bh: number, tw: number, th: number) {
  const sx = tw / bw
  const sy = th / bh
  let s = Math.sqrt(sx * sy)
  const minimo = Math.min(sx, sy)
  s = Math.min(Math.max(s, minimo * 0.85), minimo * 2.4)

  const contenidos = elementos.filter((el) => !sangra(el, bw, bh))
  for (const el of contenidos) {
    if (el.w > 1) s = Math.min(s, (tw - MARGEN_MIN) / el.w)
    if (el.h > 1) s = Math.min(s, (th - MARGEN_MIN) / el.h)
  }
  if (contenidos.length) {
    const u = unir(contenidos.map(caja))
    if (u.w > 1) s = Math.min(s, (tw - MARGEN_MIN) / u.w)
    if (u.h > 1) s = Math.min(s, (th - MARGEN_MIN) / u.h)
  }
  return Math.max(s, 0.05)
}

function replicarUniforme(elementos: Elemento[], bw: number, bh: number, tw: number, th: number): Elemento[] {
  const s = escalaUniforme(elementos, bw, bh, tw, th)
  return elementos.map((el) => {
    const escalado = escalarElemento(el, s)
    const fuera = sangra(el, bw, bh)
    const estiraH = el.w >= bw * 0.92
    const estiraV = el.h >= bh * 0.92

    let x: number
    let w = escalado.w
    if (estiraH) {
      const izq = el.x * s
      const der = (bw - (el.x + el.w)) * s
      w = Math.max(8, tw - izq - der)
      x = izq
    } else {
      switch (anclaH(el, bw)) {
        case 'izquierda':
          x = el.x * s
          break
        case 'derecha':
          x = tw - (bw - (el.x + el.w)) * s - w
          break
        default: {
          const desplazado = (el.x + el.w / 2 - bw / 2) * s
          x = tw / 2 + desplazado - w / 2
        }
      }
    }

    let y: number
    let h = escalado.h
    if (estiraV) {
      const arriba = el.y * s
      const abajo = (bh - (el.y + el.h)) * s
      h = Math.max(8, th - arriba - abajo)
      y = arriba
    } else {
      switch (anclaV(el, bh)) {
        case 'arriba':
          y = el.y * s
          break
        case 'abajo':
          y = th - (bh - (el.y + el.h)) * s - h
          break
        default: {
          const desplazado = (el.y + el.h / 2 - bh / 2) * s
          y = th / 2 + desplazado - h / 2
        }
      }
    }

    return limitar({ ...escalado, x, y, w, h }, tw, th, !fuera)
  })
}

interface Zona {
  elementos: Elemento[]
  bbox: Caja
}

function agruparPorZona(elementos: Elemento[], bh: number): Zona[] {
  const zonas: Elemento[][] = [[], [], []]
  for (const el of elementos) {
    const a = anclaV(el, bh)
    zonas[a === 'arriba' ? 0 : a === 'centro' ? 1 : 2].push(el)
  }
  return zonas
    .filter((z) => z.length > 0)
    .map((z) => ({ elementos: z, bbox: unir(z.map(caja)) }))
}

/** ¿Este elemento forma parte del botón de llamada a la acción? */
function esDelCta(el: Elemento): boolean {
  return /cta/i.test(el.nombre) || Boolean(el.enlace?.url)
}

/**
 * Agrupa los elementos por el papel que cumplen, no por dónde estaban en el
 * lienzo base.
 *
 * Una pieza apaisada se lee en tres tiempos: quién lo dice (el logotipo), qué
 * dice (el mensaje) y qué hay que hacer (el botón). Agrupar por la posición que
 * ocupaban en un lienzo cuadrado repartía mal las franjas, porque en el cuadrado
 * el orden es vertical y aquí es horizontal.
 *
 * Las zonas vacías no se crean: un banner sin logotipo reparte su ancho entre
 * las dos que quedan en vez de dejar un hueco.
 */
function agruparPorPapel(elementos: Elemento[], bh: number): Zona[] {
  const logo = elementos.filter((el) => el.tipo === 'logo')
  const cta = elementos.filter((el) => el.tipo !== 'logo' && esDelCta(el))
  const mensaje = elementos.filter((el) => el.tipo !== 'logo' && !esDelCta(el))

  const grupos = [logo, mensaje, cta].filter((g) => g.length > 0)
  // Sin logotipo ni botón reconocibles no hay tres tiempos que respetar: se
  // vuelve al reparto por posición, que es mejor que inventar una jerarquía.
  if (grupos.length < 2) return agruparPorZona(elementos, bh)
  return grupos.map((g) => ({ elementos: g, bbox: unir(g.map(caja)) }))
}

function replicarBanda(elementos: Elemento[], bw: number, bh: number, tw: number, th: number): Elemento[] {
  const contenidos = elementos.filter((el) => !sangra(el, bw, bh))
  const decorativos = elementos.filter((el) => sangra(el, bw, bh))
  if (!contenidos.length) return replicarUniforme(elementos, bw, bh, tw, th)

  const zonas = agruparPorPapel(contenidos, bh)
  const altoUtil = th - MARGEN_MIN * 2
  const anchoUtil = tw - MARGEN_MIN * 2
  const separacion = 0.04 * anchoUtil
  const anchoDisponible = anchoUtil - separacion * (zonas.length - 1)

  /**
   * Reparto de una pieza horizontal.
   *
   * Un banner apaisado no se lee como un cuadrado estirado: se lee de izquierda a
   * derecha en tres tiempos —quién lo dice, qué dice y qué hay que hacer—, y el
   * del medio necesita más aire porque lleva el mensaje. De ahí el reparto
   * 20 / 60 / 20, que es además la proporción con la que se diagramaron las
   * referencias de la marca.
   *
   * Con dos zonas el mensaje sigue mandando; con una, ocupa todo.
   */
  const REPARTOS: Record<number, number[]> = { 1: [1], 2: [0.3, 0.7], 3: [0.2, 0.6, 0.2] }
  const reparto = REPARTOS[zonas.length] ?? zonas.map(() => 1 / zonas.length)

  const resultado: Elemento[] = []
  let cursor = MARGEN_MIN
  zonas.forEach((zona, i) => {
    const anchoZona = anchoDisponible * reparto[i]
    /**
     * Cada zona se escala dentro de su propio hueco, no con una escala común.
     * Así el logotipo, que va solo en su franja, crece hasta llenarla en vez de
     * quedar diminuto por culpa de la zona más grande de la pieza.
     */
    // El logotipo llena su franja: en una pieza apaisada es lo que identifica a la
    // marca de un vistazo y encogerlo al tamaño del lienzo base lo vuelve ilegible.
    const soloLogo = zona.elementos.every((el) => el.tipo === 'logo')
    const techo = soloLogo ? 8 : 4
    const s = Math.max(
      0.05,
      Math.min(anchoZona / Math.max(zona.bbox.w, 1), altoUtil / Math.max(zona.bbox.h, 1), techo),
    )
    const zw = zona.bbox.w * s
    const zh = zona.bbox.h * s
    // Centrado dentro de su franja, vertical y horizontalmente.
    const zx = cursor + Math.max(0, (anchoZona - zw) / 2)
    const zy = MARGEN_MIN + (altoUtil - zh) / 2
    for (const el of zona.elementos) {
      const escalado = escalarElemento(el, s)
      const x = zx + (el.x - zona.bbox.x) * s
      const y = zy + (el.y - zona.bbox.y) * s
      resultado.push(limitar({ ...escalado, x, y }, tw, th, true))
    }
    cursor += anchoZona + separacion
  })

  // Los elementos que ya sangraban en la base siguen sangrando: son el recurso
  // gráfico de fondo. En una banda horizontal su tamaño lo manda el alto, que es
  // la dimensión que realmente cambia la lectura de la pieza.
  const sDeco = th / bh
  for (const el of decorativos) {
    const escalado = escalarElemento(el, sDeco)
    const cx = (el.x + el.w / 2) / bw
    const cy = (el.y + el.h / 2) / bh
    resultado.push({ ...escalado, x: cx * tw - escalado.w / 2, y: cy * th - escalado.h / 2 })
  }
  return resultado.sort((a, b) => a.z - b.z)
}

function agruparPorFila(elementos: Elemento[]): Zona[] {
  const orden = [...elementos].sort((a, b) => a.y - b.y)
  const filas: Elemento[][] = []
  for (const el of orden) {
    const fila = filas.find((f) => {
      const b = unir(f.map(caja))
      const solape = Math.min(b.y + b.h, el.y + el.h) - Math.max(b.y, el.y)
      return solape > Math.min(b.h, el.h) * 0.45
    })
    if (fila) fila.push(el)
    else filas.push([el])
  }
  return filas.map((f) => ({ elementos: f, bbox: unir(f.map(caja)) }))
}

function replicarColumna(elementos: Elemento[], bw: number, bh: number, tw: number, th: number): Elemento[] {
  const contenidos = elementos.filter((el) => !sangra(el, bw, bh))
  const decorativos = elementos.filter((el) => sangra(el, bw, bh))
  if (!contenidos.length) return replicarUniforme(elementos, bw, bh, tw, th)

  const filas = agruparPorFila(contenidos)
  const anchoUtil = tw - MARGEN_MIN * 2
  const altoUtil = th - MARGEN_MIN * 2
  const anchoContenido = Math.max(...filas.map((f) => f.bbox.w), 1)
  const altoContenido = filas.reduce((acc, f) => acc + f.bbox.h, 0) || 1

  const s = Math.max(0.05, Math.min(anchoUtil / anchoContenido, altoUtil / altoContenido, 4))

  const altoUsado = altoContenido * s
  const huecos = Math.max(filas.length - 1, 1)
  const aire = Math.max(0, altoUtil - altoUsado) / (huecos + 1)

  const resultado: Elemento[] = []
  let cursorY = MARGEN_MIN + aire / 2
  for (const fila of filas) {
    const fw = fila.bbox.w * s
    const fx = MARGEN_MIN + (anchoUtil - fw) / 2
    for (const el of fila.elementos) {
      const escalado = escalarElemento(el, s)
      const x = fx + (el.x - fila.bbox.x) * s
      const y = cursorY + (el.y - fila.bbox.y) * s
      resultado.push(limitar({ ...escalado, x, y }, tw, th, true))
    }
    cursorY += fila.bbox.h * s + aire
  }

  // En una columna vertical la dimensión que manda es el ancho.
  const sDeco = tw / bw
  for (const el of decorativos) {
    const escalado = escalarElemento(el, sDeco)
    const cx = (el.x + el.w / 2) / bw
    const cy = (el.y + el.h / 2) / bh
    resultado.push({ ...escalado, x: cx * tw - escalado.w / 2, y: cy * th - escalado.h / 2 })
  }
  return resultado.sort((a, b) => a.z - b.z)
}

export function adaptarElementos(
  elementos: Elemento[],
  base: { ancho: number; alto: number },
  destino: { ancho: number; alto: number },
): { elementos: Elemento[]; modo: ModoReplicacion } {
  const modo = modoPara(destino.ancho, destino.alto)
  if (!elementos.length) return { elementos: [], modo }
  const args = [elementos, base.ancho, base.alto, destino.ancho, destino.alto] as const
  const salida =
    modo === 'banda'
      ? replicarBanda(...args)
      : modo === 'columna'
        ? replicarColumna(...args)
        : replicarUniforme(...args)
  return { elementos: salida.map((el) => ({ ...el, x: redondear(el.x), y: redondear(el.y), w: redondear(el.w), h: redondear(el.h) })), modo }
}

function redondear(v: number) {
  return Math.round(v * 100) / 100
}

/** El fondo no se replica por posición: se reencuadra manteniendo su foco. */
export function adaptarFondo(fondo: Fondo): Fondo {
  return { ...fondo, filtro: { ...fondo.filtro }, foco: { ...fondo.foco } }
}

export function replicarBanner(bannerBase: Banner, formato: Formato, previo?: Banner): Banner {
  const { elementos } = adaptarElementos(
    bannerBase.elementos,
    { ancho: bannerBase.ancho, alto: bannerBase.alto },
    { ancho: formato.ancho, alto: formato.alto },
  )
  return {
    formatoId: formato.id,
    ancho: formato.ancho,
    alto: formato.alto,
    base: Boolean(formato.base),
    seleccionado: previo?.seleccionado ?? true,
    ajustadoManualmente: false,
    fondo: adaptarFondo(bannerBase.fondo),
    elementos,
    enlace: { ...bannerBase.enlace },
  }
}
