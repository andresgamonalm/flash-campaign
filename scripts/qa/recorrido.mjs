/**
 * Recorrido funcional automatizado con un navegador real.
 * Cubre login, home, creación de campaña, editor, replicación, exportación
 * y las secciones de marcas, biblioteca, historial, configuración y usuarios.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788'
const SALIDA = process.env.SALIDA ?? '/tmp/qa'
mkdirSync(SALIDA, { recursive: true })

const errores = []
const fallos = []

function paso(nombre, ok, detalle = '') {
  const marca = ok ? '✓' : '✗'
  console.log(`${marca} ${nombre}${detalle ? ` — ${detalle}` : ''}`)
  if (!ok) fallos.push(`${nombre}${detalle ? `: ${detalle}` : ''}`)
}

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const contexto = await navegador.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, locale: 'es-CL' })
const pagina = await contexto.newPage()

pagina.on('console', (m) => {
  if (m.type() === 'error') errores.push(m.text())
})
pagina.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`))
pagina.on('requestfailed', (r) => errores.push(`request fallida: ${r.url()} (${r.failure()?.errorText})`))
pagina.on('response', (r) => {
  if (r.status() >= 400) errores.push(`respuesta ${r.status()}: ${r.url()}`)
})

async function captura(nombre, destino = pagina) {
  // Espera a que tipografías e imágenes estén pintadas antes de capturar.
  await destino.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => {
        i.addEventListener('load', r, { once: true })
        i.addEventListener('error', r, { once: true })
      })),
    )
  })
  await destino.waitForTimeout(350)
  await destino.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: false })
}

try {
  // ---------------------------------------------------------------- Login
  await pagina.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  paso('Carga la pantalla de login', await pagina.locator('h1', { hasText: 'Entra a tu cuenta' }).isVisible())
  await captura('01-login')

  await pagina.getByLabel('Correo o usuario').fill('hola@andresgamonal.com')
  await pagina.getByLabel('Contraseña').fill('clave-incorrecta')
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForSelector('.aviso--error', { timeout: 8000 })
  paso('Rechaza credenciales incorrectas con mensaje', true)

  await pagina.getByLabel('Contraseña').fill('Matias1402')
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL(`${BASE}/`, { timeout: 10000 })
  paso('Entra con las credenciales del administrador', true)
  await pagina.waitForLoadState('networkidle')
  await captura('02-inicio')

  // -------------------------------------------------------- Crear campaña
  await pagina.locator('.shell__nav').getByRole('link', { name: 'Crear campaña' }).click()
  await pagina.waitForURL('**/campanas/nueva')
  await pagina.getByLabel('Nombre de la campaña').fill('Zurich · Auto Digital 2 cuotas gratis')
  // Las plataformas arrancan sin marcar: elegirlas es parte del flujo.
  for (const plataforma of ['Google Search', 'Google Display', 'Meta']) {
    await pagina.getByText(plataforma, { exact: false }).first().click()
  }
  await pagina.getByRole('button', { name: 'Crear campaña', exact: false }).last().click()
  await pagina.waitForURL('**/search', { timeout: 10000 })
  paso('Crea la campaña y abre el creador de Search', true)
  await pagina.waitForLoadState('networkidle')

  await pagina.getByLabel('Acción (el CTA)').fill('Cotiza online')
  await pagina.getByLabel('Gancho u oferta comercial').fill('2 cuotas gratis en seguro de auto todo riesgo, contratando 100% online')
  await pagina.getByLabel('Destino del CTA').fill(process.env.URL_PROMO ?? 'https://www.zurich.cl/seguros/auto')
  await pagina.getByRole('button', { name: 'Guardar briefing' }).click()
  await pagina.waitForSelector('.tostada', { timeout: 8000 })
  paso('Guarda el briefing de Search', true)

  await pagina.getByRole('button', { name: 'Generar propuesta con Char B' }).click()
  await pagina.waitForSelector('.bloque-resultado', { timeout: 60000 })
  const titulos = await pagina.locator('.lista-resultado li').count()
  paso('Char B devuelve la propuesta y se pinta en pantalla', titulos > 10, `${titulos} filas de resultado`)
  const excedidos = await pagina.locator('.contador--excede').count()
  paso('Ningún texto supera los límites de Google Ads', excedidos === 0, `${excedidos} textos fuera de límite`)
  await pagina.waitForTimeout(600)
  await captura('03-search')

  const descargaCsv = pagina.waitForEvent('download', { timeout: 30000 })
  await pagina.getByRole('button', { name: 'Exportar CSV' }).click()
  const csv = await descargaCsv
  await csv.saveAs(`${SALIDA}/${csv.suggestedFilename()}`)
  paso('Exporta los anuncios de Search en CSV', true, csv.suggestedFilename())

  // ---------------------------------------------------------------- Editor
  await pagina.getByRole('button', { name: 'Ir al editor de banners' }).click()
  await pagina.waitForURL('**/editor', { timeout: 10000 })
  await pagina.waitForSelector('.lienzo canvas', { timeout: 10000 })
  const formatos = await pagina.locator('.lista-formatos li').count()
  paso('Abre el editor con todos los formatos', formatos === 19, `${formatos} formatos`)

  // Fondo de marca
  await pagina.locator('.inspector .muestra').first().click()
  // Elementos
  await pagina.getByRole('button', { name: 'Círculo' }).click()
  await pagina.getByRole('button', { name: 'Texto', exact: true }).click()
  await pagina.getByLabel('Texto', { exact: true }).last().fill('2 Cuotas\nGratis')
  await pagina.getByRole('button', { name: 'Botón CTA' }).click()
  const logoMarca = pagina.locator('.logo-marca').nth(1)
  if (await logoMarca.count()) await logoMarca.click()
  const elementos = await pagina.locator('.lienzo .caja').count()
  paso('Añade elementos al lienzo base', elementos >= 4, `${elementos} elementos`)
  await pagina.waitForTimeout(400)
  await captura('04-editor-base')

  // Arrastre real del elemento seleccionado
  const caja = pagina.locator('.lienzo .caja').nth(1)
  const antes = await caja.boundingBox()
  await pagina.mouse.move(antes.x + antes.width / 2, antes.y + antes.height / 2)
  await pagina.mouse.down()
  await pagina.mouse.move(antes.x + antes.width / 2 + 60, antes.y + antes.height / 2 + 40, { steps: 12 })
  await pagina.mouse.up()
  const despues = await caja.boundingBox()
  paso('Arrastra un elemento con el mouse', Math.abs(despues.x - antes.x) > 20 || Math.abs(despues.y - antes.y) > 20,
    `Δx=${Math.round(despues.x - antes.x)} Δy=${Math.round(despues.y - antes.y)}`)

  // Redimensionar desde una esquina
  const manija = pagina.locator('.manija--se').first()
  if (await manija.count()) {
    const m = await manija.boundingBox()
    const cajaAntes = await caja.boundingBox()
    await pagina.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
    await pagina.mouse.down()
    await pagina.mouse.move(m.x + 40, m.y + 40, { steps: 10 })
    await pagina.mouse.up()
    const cajaDespues = await caja.boundingBox()
    paso('Redimensiona desde la esquina', cajaDespues.width > cajaAntes.width + 5,
      `${Math.round(cajaAntes.width)} → ${Math.round(cajaDespues.width)}`)
  }

  // Deseleccionar tocando una zona vacía del lienzo. Se prueba porque el clic
  // llega a la capa que cubre el lienzo, no al marco: comparar con el contenedor
  // dejaba el elemento seleccionado para siempre.
  {
    const lienzo = await pagina.locator('.lienzo').first().boundingBox()
    const activaAntes = await pagina.locator('.caja--activa').count()
    await pagina.mouse.click(lienzo.x + lienzo.width - 6, lienzo.y + lienzo.height - 6)
    await pagina.waitForTimeout(200)
    const activaDespues = await pagina.locator('.caja--activa').count()
    paso(
      'Deselecciona tocando una zona vacía del lienzo',
      activaAntes > 0 && activaDespues === 0,
      `${activaAntes} → ${activaDespues} elementos activos`,
    )
  }

  // Guardar y replicar
  await pagina.getByRole('button', { name: 'Guardar', exact: true }).click()
  await pagina.waitForSelector('.tostada--exito', { timeout: 8000 })
  paso('Guarda el diseño', true)

  await pagina.getByRole('button', { name: 'Replicar' }).click()
  await pagina.waitForSelector('.tostada--exito', { timeout: 15000 })
  const textoReplica = await pagina.locator('.tostada--exito').last().textContent()
  paso('Replica el lienzo base al resto de formatos', /replicad/i.test(textoReplica ?? ''), textoReplica?.trim())
  await pagina.waitForTimeout(900)

  // Revisa un formato horizontal y uno vertical
  await pagina.locator('.formato__boton', { hasText: '728 × 90' }).click()
  await pagina.waitForTimeout(600)
  await captura('05-editor-leaderboard')
  const elementosH = await pagina.locator('.lienzo .caja').count()
  paso('El formato horizontal recibe los elementos', elementosH >= 4, `${elementosH} elementos`)

  await pagina.locator('.formato__boton', { hasText: '160 × 600' }).click()
  await pagina.waitForTimeout(600)
  await captura('06-editor-rascacielos')
  const elementosV = await pagina.locator('.lienzo .caja').count()
  paso('El formato vertical recibe los elementos', elementosV >= 4, `${elementosV} elementos`)

  await pagina.locator('.formato__boton', { hasText: '1080 × 1350' }).click()
  await pagina.waitForTimeout(600)
  await captura('07-editor-meta')

  // Vista previa
  await pagina.getByRole('button', { name: 'Vista previa' }).click()
  await pagina.waitForSelector('.previa', { timeout: 8000 })
  const piezas = await pagina.locator('.previa__pieza').count()
  paso('La vista previa muestra los formatos seleccionados', piezas > 10, `${piezas} piezas`)
  await pagina.waitForTimeout(900)
  await captura('08-vista-previa')
  await pagina.locator('.modal__pie').getByRole('button', { name: 'Cerrar' }).click()

  // Exportación real
  await pagina.getByRole('button', { name: 'Exportar' }).first().click()
  await pagina.waitForSelector('.modal', { timeout: 6000 })
  const descarga = pagina.waitForEvent('download', { timeout: 90000 })
  await pagina.getByRole('button', { name: 'Exportar', exact: true }).last().click()
  const archivo = await descarga
  const ruta = `${SALIDA}/${archivo.suggestedFilename()}`
  await archivo.saveAs(ruta)
  paso('Exporta el ZIP con JPG y HTML', true, archivo.suggestedFilename())

  // -------------------------------------------------------- Otras secciones
  for (const [enlace, marcador, nombre] of [
    ['Marcas', 'h2:has-text("Marcas")', '09-marcas'],
    ['Biblioteca de imágenes', 'h2:has-text("Biblioteca")', '10-biblioteca'],
    ['Historial', 'h2:has-text("Historial")', '11-historial'],
    ['Configuración', 'h2:has-text("Configuración")', '12-configuracion'],
    ['Usuarios', 'h2:has-text("Usuarios")', '13-usuarios'],
    ['Proyectos en curso', 'h2:has-text("Proyectos en curso")', '14-proyectos'],
  ]) {
    await pagina.locator('.shell__nav').getByRole('link', { name: enlace }).click()
    await pagina.waitForSelector(marcador, { timeout: 8000 })
    await pagina.waitForLoadState('networkidle')
    await pagina.waitForTimeout(500)
    await captura(nombre)
    paso(`Abre la sección ${enlace}`, true)
  }

  // Crear usuario real desde el panel de administración
  await pagina.locator('.shell__nav').getByRole('link', { name: 'Usuarios' }).click()
  await pagina.waitForSelector('h2:has-text("Usuarios")')
  await pagina.getByRole('button', { name: 'Crear usuario' }).click()
  await pagina.waitForSelector('.modal')
  const filasAntes = await pagina.locator('.tabla tbody tr').count()
  // Correo único por ejecución: el aplicativo rechaza duplicados y el almacén
  // conserva las cuentas creadas en pruebas anteriores.
  const correoPrueba = `equipo+${Date.now().toString(36)}@gamonal.app`
  await pagina.getByLabel('Correo').fill(correoPrueba)
  await pagina.getByLabel('Nombre').fill('Equipo de campañas')
  await pagina.getByLabel('Contraseña inicial').fill('Campanas2026')
  await pagina.getByRole('button', { name: 'Crear cuenta' }).click()
  await pagina.waitForSelector('.tostada--exito', { timeout: 8000 })
  const filas = await pagina.locator('.tabla tbody tr').count()
  paso('El administrador crea una cuenta nueva', filas === filasAntes + 1, `${filasAntes} → ${filas} cuentas`)

  // ------------------------------------------------------------ Responsive
  const movil = await contexto.newPage()
  await movil.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await movil.setViewportSize({ width: 390, height: 844 })
  await movil.waitForTimeout(700)
  const anchoScroll = await movil.evaluate(() => document.documentElement.scrollWidth)
  paso('Móvil sin scroll horizontal', anchoScroll <= 391, `scrollWidth=${anchoScroll}`)
  await captura('15-movil-inicio', movil)

  await movil.setViewportSize({ width: 834, height: 1112 })
  await movil.waitForTimeout(500)
  const anchoTablet = await movil.evaluate(() => document.documentElement.scrollWidth)
  paso('Tablet sin scroll horizontal', anchoTablet <= 835, `scrollWidth=${anchoTablet}`)
  await captura('16-tablet-inicio', movil)
  await movil.close()

  // ------------------------------------------------------------------ Salir
  await pagina.getByRole('button', { name: 'Salir' }).click()
  await pagina.waitForURL('**/login', { timeout: 8000 })
  paso('Cierra sesión y vuelve al login', true)
} catch (e) {
  paso('Recorrido completo', false, e.message)
  await captura('99-error')
} finally {
  console.log('\n--- Errores de consola ---')
  const relevantes = errores.filter((e) => !e.includes('favicon') && !e.includes('manifest'))
  if (relevantes.length === 0) console.log('(ninguno)')
  else relevantes.slice(0, 20).forEach((e) => console.log('  •', e))

  console.log(`\nResultado: ${fallos.length === 0 ? 'TODO OK' : `${fallos.length} fallo(s)`}`)
  fallos.forEach((f) => console.log('  ✗', f))
  await navegador.close()
  process.exit(fallos.length ? 1 : 0)
}
