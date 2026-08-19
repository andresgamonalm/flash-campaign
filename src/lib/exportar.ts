import { zipSync, strToU8 } from 'fflate'
import type { Banner, Elemento, Marca } from './types'
import { bannerAJpg, filtroCss, precargarImagenes } from './render'
import { buscarFormato } from './formatos'

/** Exportación de la campaña: JPG listo para subir y HTML5 con clickTag. */

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function estiloElemento(el: Elemento): string {
  const base = [
    'position:absolute',
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.w}px`,
    `height:${el.h}px`,
    `z-index:${el.z}`,
  ]
  switch (el.tipo) {
    case 'rectangulo':
      base.push(`background:${el.relleno}`, `border-radius:${el.radio}px`)
      if (el.grosorBorde > 0) base.push(`border:${el.grosorBorde}px solid ${el.borde}`, 'box-sizing:border-box')
      break
    case 'circulo':
      base.push(`background:${el.relleno}`, 'border-radius:50%')
      if (el.grosorBorde > 0) base.push(`border:${el.grosorBorde}px solid ${el.borde}`, 'box-sizing:border-box')
      break
    case 'texto':
      base.push(
        `color:${el.color}`,
        `font-family:${el.fuente}`,
        `font-size:${el.tamano}px`,
        `font-weight:${el.peso}`,
        `line-height:${el.interlineado}`,
        `text-align:${el.alineacion === 'izquierda' ? 'left' : el.alineacion === 'derecha' ? 'right' : 'center'}`,
        `padding:${el.margen.arriba}px ${el.margen.derecha}px ${el.margen.abajo}px ${el.margen.izquierda}px`,
        'box-sizing:border-box',
        'display:flex',
        'flex-direction:column',
        `justify-content:${el.alineacionVertical === 'arriba' ? 'flex-start' : el.alineacionVertical === 'abajo' ? 'flex-end' : 'center'}`,
        'white-space:pre-wrap',
        'overflow:hidden',
      )
      if (el.fondo && el.fondo !== 'transparent') base.push(`background:${el.fondo}`, `border-radius:${el.radio}px`)
      break
    case 'imagen':
    case 'logo':
      base.push(`border-radius:${el.radio}px`, 'overflow:hidden')
      break
  }
  return base.join(';')
}

/**
 * Las piezas HTML se suben a Google Ads o a Campaign Manager como archivos
 * sueltos: no pueden depender de rutas del aplicativo. Cada imagen se incrusta
 * como data URI conservando su formato original.
 */
const incrustadas = new Map<string, string>()

async function aDataUrl(src: string): Promise<string> {
  if (!src) return src
  if (src.startsWith('data:')) return src
  const guardada = incrustadas.get(src)
  if (guardada) return guardada
  try {
    const respuesta = await fetch(src, { credentials: 'same-origin' })
    if (!respuesta.ok) throw new Error(`respuesta ${respuesta.status}`)
    const blob = await respuesta.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader()
      lector.onload = () => resolve(String(lector.result))
      lector.onerror = () => reject(lector.error ?? new Error('lectura fallida'))
      lector.readAsDataURL(blob)
    })
    incrustadas.set(src, dataUrl)
    return dataUrl
  } catch {
    // Si una imagen no se puede incrustar se deja la ruta original: la pieza
    // seguirá siendo válida dentro del propio dominio.
    return src
  }
}

async function fuentesIncrustadas(banner: Banner): Promise<Map<string, string>> {
  const fuentes = new Set<string>()
  if (banner.fondo.tipo === 'imagen' && banner.fondo.imagenSrc) fuentes.add(banner.fondo.imagenSrc)
  for (const el of banner.elementos) {
    if ((el.tipo === 'imagen' || el.tipo === 'logo') && el.src) fuentes.add(el.src)
  }
  const mapa = new Map<string, string>()
  await Promise.all([...fuentes].map(async (src) => mapa.set(src, await aDataUrl(src))))
  return mapa
}

function cuerpoElemento(el: Elemento, imagenes: Map<string, string>): string {
  const estilo = estiloElemento(el)
  switch (el.tipo) {
    case 'texto':
      return `<div class="el" style="${estilo}">${escapar(el.texto)}</div>`
    case 'imagen':
    case 'logo': {
      const src = imagenes.get(el.src) ?? el.src
      return `<div class="el" style="${estilo}"><img src="${src}" alt="" style="width:100%;height:100%;object-fit:${el.ajuste};display:block"></div>`
    }
    default:
      return `<div class="el" style="${estilo}"></div>`
  }
}

export async function bannerAHtml(banner: Banner, nombreCampana: string): Promise<string> {
  const formato = buscarFormato(banner.formatoId)
  const imagenes = await fuentesIncrustadas(banner)
  const elementos = [...banner.elementos]
    .sort((a, b) => a.z - b.z)
    .map((el) => cuerpoElemento(el, imagenes))
    .join('\n    ')
  const fondoSrc = banner.fondo.imagenSrc ? (imagenes.get(banner.fondo.imagenSrc) ?? banner.fondo.imagenSrc) : ''
  const fondo =
    banner.fondo.tipo === 'imagen' && banner.fondo.imagenSrc
      ? `<div class="fondo-img" style="background-image:url('${fondoSrc}');background-size:${banner.fondo.ajuste};background-position:${(banner.fondo.foco.x * 100).toFixed(1)}% ${(banner.fondo.foco.y * 100).toFixed(1)}%;filter:${filtroCss(banner.fondo.filtro)}"></div>`
      : ''
  const tinte =
    banner.fondo.filtro.preset === 'tinte_marca' && banner.fondo.tipo === 'imagen'
      ? `<div class="tinte" style="background:${banner.fondo.filtro.color || '#040764'};opacity:${(banner.fondo.filtro.intensidad / 100).toFixed(2)}"></div>`
      : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="ad.size" content="width=${banner.ancho},height=${banner.alto}">
<title>${escapar(nombreCampana)} — ${banner.ancho}x${banner.alto}${formato ? ` (${escapar(formato.nombre)})` : ''}</title>
<style>
  html,body{margin:0;padding:0;background:transparent}
  #banner{position:relative;width:${banner.ancho}px;height:${banner.alto}px;overflow:hidden;background:${banner.fondo.color};font-family:Arial,Helvetica,sans-serif}
  #banner .fondo-img{position:absolute;inset:0;background-repeat:no-repeat}
  #banner .tinte{position:absolute;inset:0}
  #banner .el{position:absolute}
  #clic{position:absolute;inset:0;z-index:9999;cursor:pointer;display:block}
</style>
</head>
<body>
  <div id="banner">
    ${fondo}
    ${tinte}
    ${elementos}
    <a id="clic" href="${escapar(banner.enlace.url || '#')}" target="${banner.enlace.destino}" rel="noopener" aria-label="${escapar(nombreCampana)}"></a>
  </div>
  <script>
    // clickTag estándar para Google Ads / Campaign Manager.
    var clickTag = ${JSON.stringify(banner.enlace.url || '')};
    (function () {
      var a = document.getElementById('clic');
      a.addEventListener('click', function (ev) {
        if (!clickTag) return;
        ev.preventDefault();
        window.open(clickTag, ${JSON.stringify(banner.enlace.destino)});
      });
    })();
  </script>
</body>
</html>
`
}

export function normalizarNombre(texto: string): string {
  return (
    texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'campana'
  )
}

export function nombreArchivo(nombreCampana: string, banner: Banner, extension: string, escala = 1): string {
  const sufijo = escala > 1 ? `_${escala}x` : ''
  return `${normalizarNombre(nombreCampana)}_${banner.ancho}x${banner.alto}${sufijo}.${extension}`
}

export interface OpcionesExportacion {
  jpg: boolean
  html: boolean
  calidadJpg: number
  /**
   * Multiplicador de resolución del JPG.
   *
   * A 1x el archivo mide exactamente lo que declara el formato, que es lo que
   * exige Google Ads para subir la pieza. A 2x o 3x el archivo se ve nítido en
   * pantallas de alta densidad y en presentaciones, pero ya no cumple la medida
   * exacta del formato.
   */
  escalaJpg: number
}

export async function exportarBanners(
  banners: Banner[],
  nombreCampana: string,
  opciones: OpcionesExportacion,
  _marca?: Marca | null,
): Promise<{ blob: Blob; nombre: string; archivos: string[] }> {
  await precargarImagenes(banners)
  const archivos: Record<string, Uint8Array> = {}
  const listado: string[] = []

  for (const banner of banners) {
    if (opciones.jpg) {
      const escala = Math.max(1, Math.min(4, opciones.escalaJpg || 1))
      const blob = await bannerAJpg(banner, opciones.calidadJpg, escala)
      const nombre = nombreArchivo(nombreCampana, banner, 'jpg', escala)
      archivos[`jpg/${nombre}`] = new Uint8Array(await blob.arrayBuffer())
      listado.push(`jpg/${nombre}`)
    }
    if (opciones.html) {
      const nombre = nombreArchivo(nombreCampana, banner, 'html')
      const carpeta = `html/${nombre.replace(/\.html$/, '')}`
      archivos[`${carpeta}/index.html`] = strToU8(await bannerAHtml(banner, nombreCampana))
      listado.push(`${carpeta}/index.html`)
    }
  }

  archivos['LEEME.txt'] = strToU8(
    [
      `Campaña: ${nombreCampana}`,
      `Exportado: ${new Date().toLocaleString('es-CL')}`,
      `Piezas: ${banners.length}`,
      '',
      'Contenido:',
      ...listado.map((l) => `- ${l}`),
      '',
      opciones.escalaJpg > 1
        ? `Los JPG salen a ${opciones.escalaJpg}x: se ven nitidos en pantalla y en presentaciones, pero`
        : 'Los JPG salen al tamano exacto de cada formato, listos para subir a Google Ads y Meta.',
      opciones.escalaJpg > 1
        ? 'para subirlos a Google Ads hay que exportarlos a 1x, que es la medida exacta exigida.'
        : '',
      '',
      'Los HTML incluyen la variable clickTag y la etiqueta ad.size que exigen',
      'Google Ads y Campaign Manager. Cada carpeta html/ es una pieza autónoma.',
      'Generado con Flash Campaign.',
    ].join('\n'),
  )

  const zip = zipSync(archivos, { level: 6 })
  const nombre = `${normalizarNombre(nombreCampana)}_banners.zip`
  return { blob: new Blob([zip as BlobPart], { type: 'application/zip' }), nombre, archivos: listado }
}

export function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
