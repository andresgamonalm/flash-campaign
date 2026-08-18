/**
 * Genera las capturas reales del producto en funcionamiento (1920 × 1080) y la
 * portada de presentación. Trabaja contra el aplicativo levantado de verdad, no
 * sobre maquetas.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788'
const SALIDA = process.env.SALIDA ?? 'docs/capturas'
const URL_PROMO = process.env.URL_PROMO ?? 'http://127.0.0.1:8899/promo'
mkdirSync(SALIDA, { recursive: true })

const AZUL = '#23366F'
const CELESTE = '#1FB1E6'
const ARENA = '#DAD2BD'

function texto(id, extra) {
  return {
    id,
    nombre: extra.nombre ?? 'Texto',
    tipo: 'texto',
    color: '#FFFFFF',
    fuente: 'Arial',
    peso: 600,
    alineacion: 'izquierda',
    alineacionVertical: 'centro',
    interlineado: 1.1,
    margen: { arriba: 2, derecha: 4, abajo: 2, izquierda: 4 },
    radio: 0,
    autoAjuste: true,
    ...extra,
  }
}

const ELEMENTOS = [
  { id: 'c1', nombre: 'Círculo celeste', tipo: 'circulo', x: 168, y: 108, w: 200, h: 200, z: 1, relleno: CELESTE, borde: CELESTE, grosorBorde: 0, radio: 0 },
  { id: 'c2', nombre: 'Semicírculo arena', tipo: 'circulo', x: -34, y: 198, w: 96, h: 96, z: 2, relleno: ARENA, borde: ARENA, grosorBorde: 0, radio: 0 },
  { id: 'lg', nombre: 'Logo Zurich', tipo: 'logo', x: 16, y: 14, w: 112, h: 27, z: 3, src: '/brand/zurich/zurich_logo_horizontal_blanco.png', ajuste: 'contain', radio: 0 },
  texto('t1', { nombre: 'Bajada', x: 16, y: 50, w: 170, h: 22, z: 4, texto: 'Seguro', tamano: 15, peso: 500 }),
  texto('t2', { nombre: 'Título', x: 16, y: 70, w: 180, h: 46, z: 5, texto: 'Auto Digital', tamano: 30 }),
  texto('t3', { nombre: 'Oferta', x: 178, y: 130, w: 132, h: 76, z: 6, texto: '2 Cuotas Gratis', tamano: 26, alineacion: 'centro' }),
  { id: 'cta', nombre: 'Botón CTA', tipo: 'rectangulo', x: 16, y: 196, w: 152, h: 38, z: 7, relleno: '#FFFFFF', borde: '#FFFFFF', grosorBorde: 0, radio: 19 },
  texto('ctat', { nombre: 'Texto del CTA', x: 16, y: 196, w: 152, h: 38, z: 8, texto: 'Contrata online', tamano: 15, color: AZUL, alineacion: 'centro' }),
]

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const contexto = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'es-CL' })
const pagina = await contexto.newPage()

async function estable() {
  await pagina.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => {
        i.addEventListener('load', r, { once: true })
        i.addEventListener('error', r, { once: true })
      })),
    )
  })
  await pagina.waitForTimeout(900)
}

async function capturar(nombre) {
  await estable()
  await pagina.screenshot({ path: `${SALIDA}/${nombre}.jpg`, type: 'jpeg', quality: 92 })
  console.log('✓', `${SALIDA}/${nombre}.jpg`)
}

await pagina.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await capturar('pantalla_acceso_flash_campaign')

const proyectoId = await pagina.evaluate(
  async ({ elementos, azul, urlPromo }) => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'hola@andresgamonal.com', clave: 'Matías1402' }),
    })
    const formatos = [
      ['gd-300x250', 300, 250, true], ['gd-336x280', 336, 280], ['gd-250x250', 250, 250], ['gd-200x200', 200, 200],
      ['gd-728x90', 728, 90], ['gd-970x90', 970, 90], ['gd-970x250', 970, 250], ['gd-468x60', 468, 60],
      ['gd-320x50', 320, 50], ['gd-320x100', 320, 100], ['gd-300x600', 300, 600], ['gd-160x600', 160, 600],
      ['gd-120x600', 120, 600], ['gd-300x1050', 300, 1050], ['mt-1080x1080', 1080, 1080], ['mt-1080x1350', 1080, 1350],
      ['mt-1080x1920', 1080, 1920], ['mt-1200x628', 1200, 628], ['mt-1080x566', 1080, 566],
    ]
    const fondo = {
      tipo: 'color', color: azul, ajuste: 'cover', foco: { x: 0.5, y: 0.5 },
      filtro: { preset: 'ninguno', intensidad: 40, color: azul },
    }
    const banners = formatos.map(([id, ancho, alto, base]) => ({
      formatoId: id, ancho, alto, seleccionado: true, base: Boolean(base), ajustadoManualmente: false,
      fondo: { ...fondo }, elementos: base ? elementos : [],
      enlace: { url: 'https://www.zurich.cl/seguros/auto', destino: '_blank' },
    }))
    const respuesta = await fetch('/api/proyectos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nombre: 'Zurich · Auto Digital 2 cuotas gratis',
        canales: ['search', 'display', 'meta'],
        marcaId: 'marca_zurich',
        brief: {
          tiposAnuncio: ['Anuncios de búsqueda responsivos (RSA)', 'Promoción por tiempo limitado'],
          accionCta: 'Cotiza online',
          ganchoOferta: '2 cuotas gratis en seguro de auto todo riesgo, contratando 100% online',
          destinoCta: urlPromo,
          urlReferencia1: '',
          urlReferencia2: '',
          imagenes: [],
          indicaciones: 'Destacar el deducible UF 10 y la contratación sin llamadas.',
        },
        diseno: { marcaId: 'marca_zurich', estiloLibre: false, banners },
      }),
    })
    const datos = await respuesta.json()
    return datos.proyecto.id
  },
  { elementos: ELEMENTOS, azul: AZUL, urlPromo: URL_PROMO },
)

await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await capturar('pantalla_inicio_flash_campaign')

await pagina.goto(`${BASE}/campanas/${proyectoId}/search`, { waitUntil: 'networkidle' })
await pagina.getByRole('button', { name: 'Generar propuesta con Char B' }).click()
await pagina.waitForSelector('.bloque-resultado', { timeout: 60000 })
await pagina.waitForTimeout(800)
await capturar('pantalla_search_flash_campaign')

await pagina.goto(`${BASE}/campanas/${proyectoId}/editor`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.lienzo canvas')
await pagina.getByRole('button', { name: 'Replicar' }).click()
await pagina.waitForSelector('.tostada--exito', { timeout: 20000 })
await pagina.waitForTimeout(2600)
await capturar('pantalla_editor_flash_campaign')

await pagina.getByRole('button', { name: 'Vista previa' }).click()
await pagina.waitForSelector('.previa')
await pagina.waitForTimeout(2600)
await capturar('pantalla_formatos_flash_campaign')
await pagina.locator('.modal__pie').getByRole('button', { name: 'Cerrar' }).click()

await pagina.goto(`${BASE}/biblioteca`, { waitUntil: 'networkidle' })
await capturar('pantalla_biblioteca_flash_campaign')

await navegador.close()
console.log('Capturas listas.')
