/**
 * Prueba visual de las reglas de replicación.
 *
 * Crea una campaña con un lienzo base de 300 × 250 al estilo de las referencias
 * de Zurich, ejecuta la replicación desde la propia interfaz y guarda una hoja de
 * contactos con los 19 formatos para revisarlos uno a uno.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788'
const SALIDA = process.env.SALIDA ?? '/tmp/qa'
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
const contexto = await navegador.newContext({ viewport: { width: 1600, height: 1000 }, locale: 'es-CL' })
const pagina = await contexto.newPage()

await pagina.goto(`${BASE}/login`, { waitUntil: 'networkidle' })

// Crea la campaña con el lienzo base ya dibujado, a través de la propia API.
const proyectoId = await pagina.evaluate(
  async ({ elementos, azul }) => {
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'andres', clave: 'Matias1402' }),
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
        nombre: 'Zurich Auto Digital · prueba de replicación',
        canales: ['display', 'meta'],
        marcaId: 'marca_zurich',
        diseno: { marcaId: 'marca_zurich', estiloLibre: false, banners },
      }),
    })
    const datos = await respuesta.json()
    return datos.proyecto.id
  },
  { elementos: ELEMENTOS, azul: AZUL },
)

await pagina.goto(`${BASE}/campanas/${proyectoId}/editor`, { waitUntil: 'networkidle' })
await pagina.waitForSelector('.lienzo canvas')
await pagina.waitForTimeout(1200)
await pagina.screenshot({ path: `${SALIDA}/r00-base.png` })

await pagina.getByRole('button', { name: 'Replicar' }).click()
await pagina.waitForSelector('.tostada--exito', { timeout: 20000 })
await pagina.waitForTimeout(1500)

await pagina.getByRole('button', { name: 'Vista previa' }).click()
await pagina.waitForSelector('.previa')
await pagina.waitForTimeout(2500)
await pagina.locator('.modal').screenshot({ path: `${SALIDA}/r01-todos-los-formatos.png` })

// Guarda cada formato por separado para revisarlos a tamaño real.
await pagina.locator('.modal__pie').getByRole('button', { name: 'Cerrar' }).click()
const total = await pagina.locator('.lista-formatos li').count()
for (let i = 0; i < total; i += 1) {
  await pagina.locator('.formato__boton').nth(i).click()
  await pagina.waitForTimeout(500)
  const etiqueta = (await pagina.locator('.editor__info-formato strong').textContent()) ?? `formato-${i}`
  const nombre = etiqueta.split('·').pop().trim().replace(/[^0-9x×]/g, '').replace('×', 'x')
  await pagina.locator('.lienzo').screenshot({ path: `${SALIDA}/r-formato-${String(i).padStart(2, '0')}-${nombre}.png` })
}

console.log(`Listo. ${total} formatos capturados en ${SALIDA}`)
await navegador.close()
