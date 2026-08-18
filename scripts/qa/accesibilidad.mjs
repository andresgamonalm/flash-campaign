/**
 * Auditoría de accesibilidad sobre el aplicativo levantado: nombres accesibles,
 * etiquetas de formulario, texto alternativo, jerarquía de encabezados, tamaño
 * táctil y contraste WCAG AA de todos los textos visibles.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788'

const REVISION = `() => {
  const problemas = []
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'
  }
  const describir = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')

  // 1. Nombre accesible en controles
  for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
    if (!visible(el)) continue
    const nombre = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim()
    if (!nombre) problemas.push({ tipo: 'sin-nombre-accesible', elemento: describir(el) })
  }

  // 2. Etiqueta en campos de formulario
  for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (!visible(el)) continue
    const id = el.id
    const etiquetado =
      (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')) ||
      el.closest('label') ||
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby')
    if (!etiquetado) problemas.push({ tipo: 'campo-sin-etiqueta', elemento: describir(el), id })
  }

  // 3. Texto alternativo en imágenes
  for (const el of document.querySelectorAll('img')) {
    if (!visible(el)) continue
    if (el.getAttribute('alt') === null) problemas.push({ tipo: 'img-sin-alt', elemento: el.getAttribute('src') })
  }

  // 4. Jerarquía de encabezados
  const niveles = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => Number(h.tagName[1]))
  for (let i = 1; i < niveles.length; i += 1) {
    if (niveles[i] - niveles[i - 1] > 1) problemas.push({ tipo: 'salto-de-encabezado', detalle: 'h' + niveles[i - 1] + ' → h' + niveles[i] })
  }

  // 5. Área táctil mínima
  for (const el of document.querySelectorAll('button, a[href], input[type=checkbox], select')) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.height < 24 || r.width < 24) problemas.push({ tipo: 'area-tactil-pequena', elemento: describir(el), medidas: Math.round(r.width) + 'x' + Math.round(r.height) })
  }

  // 6. Contraste de texto
  const aRgb = (color) => {
    const m = color.match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const p = m[1].split(',').map((v) => parseFloat(v))
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
  }
  const lum = (c) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const fondoDe = (el) => {
    let actual = el
    while (actual && actual !== document.documentElement) {
      const c = aRgb(getComputedStyle(actual).backgroundColor)
      if (c && c.a > 0.5) return c
      actual = actual.parentElement
    }
    return { r: 255, g: 255, b: 255, a: 1 }
  }
  for (const el of document.querySelectorAll('p, span, a, li, td, th, label, h1, h2, h3, h4, button, dd, dt, strong, legend')) {
    if (!visible(el)) continue
    const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
    if (!propio) continue
    const estilo = getComputedStyle(el)
    const texto = aRgb(estilo.color)
    const fondo = fondoDe(el)
    if (!texto || !fondo) continue
    const l1 = lum(texto), l2 = lum(fondo)
    const razon = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    const tam = parseFloat(estilo.fontSize)
    const grande = tam >= 24 || (tam >= 18.66 && Number(estilo.fontWeight) >= 600)
    const minimo = grande ? 3 : 4.5
    if (razon < minimo) {
      problemas.push({
        tipo: 'contraste-bajo',
        elemento: describir(el),
        texto: el.textContent.trim().slice(0, 40),
        razon: razon.toFixed(2),
        minimo,
        color: estilo.color,
        fondo: 'rgb(' + fondo.r + ',' + fondo.g + ',' + fondo.b + ')',
      })
    }
  }
  return problemas
}`

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 960 }, locale: 'es-CL' })
const pagina = await contexto.newPage()

await pagina.goto(`${BASE}/login`, { waitUntil: 'networkidle' })

const rutas = ['/login']
let total = 0

async function auditar(ruta) {
  await pagina.waitForTimeout(900)
  const problemas = await pagina.evaluate(`(${REVISION})()`)
  // Se agrupan por tipo para que el informe sea legible.
  const porTipo = {}
  for (const p of problemas) (porTipo[p.tipo] ??= []).push(p)
  console.log(`\n=== ${ruta} ===`)
  if (!problemas.length) {
    console.log('  sin hallazgos')
    return
  }
  total += problemas.length
  for (const [tipo, lista] of Object.entries(porTipo)) {
    console.log(`  ${tipo} (${lista.length})`)
    lista.slice(0, 6).forEach((p) => console.log('    ·', JSON.stringify(p)))
  }
}

await auditar('/login')

await pagina.fill('input[type=email]', 'hola@andresgamonal.com')
await pagina.fill('input[type=password]', 'Matías1402')
await pagina.click('button[type=submit]')
await pagina.waitForURL(`${BASE}/`)

for (const ruta of ['/', '/campanas/nueva', '/proyectos', '/marcas', '/biblioteca', '/historial', '/configuracion', '/usuarios']) {
  await pagina.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' })
  rutas.push(ruta)
  await auditar(ruta)
}

const proyectos = await pagina.evaluate(async () => (await (await fetch('/api/proyectos')).json()).proyectos)
if (proyectos.length) {
  for (const sufijo of ['/search', '/editor']) {
    await pagina.goto(`${BASE}/campanas/${proyectos[0].id}${sufijo}`, { waitUntil: 'networkidle' })
    await pagina.waitForTimeout(1200)
    await auditar(`campaña${sufijo}`)
  }
}

console.log(`\nRutas auditadas: ${rutas.length + 2} · hallazgos totales: ${total}`)
await navegador.close()
process.exit(total ? 1 : 0)
