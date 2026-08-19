/**
 * Prueba táctil del editor.
 *
 * El brief exige que en tablet el aplicativo se pueda usar y que en móvil al
 * menos se pueda revisar. Aquí no se simula un ratón estrecho: se abre un
 * dispositivo con pantalla táctil y se arrastra y redimensiona con el dedo,
 * porque son gestos que sólo fallan cuando de verdad se tocan.
 */
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788'
const USUARIO = process.env.USUARIO ?? 'andres'
const CLAVE = process.env.CLAVE ?? 'Matias1402'

let fallos = 0
function paso(nombre, ok, detalle = '') {
  if (!ok) fallos += 1
  console.log(`${ok ? '✓' : '✗'} ${nombre}${detalle ? ` — ${detalle}` : ''}`)
}

/** Arrastra con el dedo: pulsar, mover en varios tramos y soltar. */
async function arrastrarConDedo(pagina, desde, hasta, tramos = 8) {
  await pagina.touchscreen.tap(desde.x, desde.y)
  const cliente = await pagina.context().newCDPSession(pagina)
  await cliente.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: desde.x, y: desde.y }],
  })
  for (let i = 1; i <= tramos; i += 1) {
    await cliente.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: desde.x + ((hasta.x - desde.x) * i) / tramos,
          y: desde.y + ((hasta.y - desde.y) * i) / tramos,
        },
      ],
    })
    await pagina.waitForTimeout(16)
  }
  await cliente.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cliente.detach()
}

async function entrar(pagina) {
  await pagina.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pagina.getByLabel('Correo o usuario').fill(USUARIO)
  await pagina.getByLabel('Contraseña').fill(CLAVE)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL(`${BASE}/`, { timeout: 15000 })
}

async function abrirEditor(pagina) {
  await pagina.goto(`${BASE}/campanas/nueva`, { waitUntil: 'networkidle' })
  await pagina.getByLabel('Nombre de la campaña').fill('Prueba táctil')
  for (const plataforma of ['Google Display', 'Meta']) {
    await pagina.getByText(plataforma, { exact: false }).first().click()
  }
  await pagina.getByRole('button', { name: 'Crear campaña', exact: false }).last().click()
  await pagina.waitForURL('**/editor', { timeout: 20000 })
  await pagina.waitForLoadState('networkidle')
}

async function probarTablet(navegador) {
  const contexto = await navegador.newContext({ ...devices['iPad (gen 7)'], hasTouch: true })
  const pagina = await contexto.newPage()
  await entrar(pagina)
  await abrirEditor(pagina)

  const anchoDoc = await pagina.evaluate(() => document.documentElement.scrollWidth)
  const anchoVista = await pagina.evaluate(() => window.innerWidth)
  paso('Tablet sin scroll horizontal', anchoDoc <= anchoVista + 1, `${anchoDoc} vs ${anchoVista}`)

  // Añadir un elemento con el dedo.
  await pagina.getByRole('button', { name: 'Rectángulo', exact: false }).first().tap()
  await pagina.waitForTimeout(400)
  const cajas = pagina.locator('.caja')
  paso('Tablet añade un elemento tocando', (await cajas.count()) > 0, `${await cajas.count()} elementos`)

  const caja = cajas.last()
  await caja.tap()
  await pagina.waitForTimeout(200)

  const antes = await caja.boundingBox()
  await arrastrarConDedo(
    pagina,
    { x: antes.x + antes.width / 2, y: antes.y + antes.height / 2 },
    { x: antes.x + antes.width / 2 + 70, y: antes.y + antes.height / 2 + 50 },
  )
  await pagina.waitForTimeout(300)
  const despues = await caja.boundingBox()
  const dx = Math.round(despues.x - antes.x)
  const dy = Math.round(despues.y - antes.y)
  paso('Tablet arrastra un elemento con el dedo', dx > 25 && dy > 15, `Δx=${dx} Δy=${dy}`)

  // Redimensionar desde la esquina con el dedo.
  const manija = pagina.locator('.caja--activa .manija--se').first()
  paso('Tablet muestra el manejador de redimensión', await manija.isVisible())
  const cajaManija = await manija.boundingBox()
  paso(
    'El manejador tiene área de agarre suficiente para el dedo',
    cajaManija.width >= 16 && cajaManija.height >= 16,
    `${Math.round(cajaManija.width)}×${Math.round(cajaManija.height)} px`,
  )

  const previo = await caja.boundingBox()
  await arrastrarConDedo(
    pagina,
    { x: cajaManija.x + cajaManija.width / 2, y: cajaManija.y + cajaManija.height / 2 },
    { x: cajaManija.x + cajaManija.width / 2 + 60, y: cajaManija.y + cajaManija.height / 2 + 60 },
  )
  await pagina.waitForTimeout(300)
  const final = await caja.boundingBox()
  paso(
    'Tablet redimensiona desde la esquina con el dedo',
    final.width > previo.width + 15,
    `${Math.round(previo.width)} → ${Math.round(final.width)} px`,
  )

  await contexto.close()
}

async function probarMovil(navegador) {
  const contexto = await navegador.newContext({ ...devices['iPhone 13'], hasTouch: true })
  const pagina = await contexto.newPage()
  await entrar(pagina)

  for (const [nombre, ruta] of [
    ['Inicio', '/'],
    ['Proyectos', '/proyectos'],
    ['Marcas', '/marcas'],
    ['Biblioteca', '/biblioteca'],
    ['Historial', '/historial'],
    ['Configuración', '/configuracion'],
  ]) {
    await pagina.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' })
    const ancho = await pagina.evaluate(() => document.documentElement.scrollWidth)
    const vista = await pagina.evaluate(() => window.innerWidth)
    paso(`Móvil revisa ${nombre} sin desbordes`, ancho <= vista + 1, `${ancho} vs ${vista}`)
  }

  await contexto.close()
}

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
try {
  await probarTablet(navegador)
  await probarMovil(navegador)
} finally {
  await navegador.close()
}

console.log(fallos === 0 ? '\nResultado: TODO OK' : `\nResultado: ${fallos} fallo(s)`)
process.exit(fallos === 0 ? 0 : 1)
