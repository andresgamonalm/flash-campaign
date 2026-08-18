/**
 * Portada de presentación 1920 × 1080 con fondo #F5F5F5, el logotipo del
 * aplicativo y su nombre comercial, según el protocolo de entregables.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8788'
const SALIDA = process.env.SALIDA ?? 'docs'
mkdirSync(SALIDA, { recursive: true })

const HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<style>
  @font-face { font-family: Roboto; src: url('${BASE}/assets/roboto-latin-400-normal-BqEyEoaF.woff2') format('woff2'); font-weight: 400; }
  @font-face { font-family: Roboto; src: url('${BASE}/assets/roboto-latin-600-normal-CzqH9ZEY.woff2') format('woff2'); font-weight: 600; }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1920px; height: 1080px; background: #F5F5F5;
    font-family: Roboto, Arial, sans-serif; color: #3B3B3B;
    display: grid; grid-template-columns: 1fr 1fr; align-items: center;
  }
  .texto { padding: 0 0 0 140px; display: flex; flex-direction: column; gap: 28px; }
  .texto img { width: 560px; height: auto; }
  h1 { font-size: 40px; font-weight: 600; color: #040764; max-width: 16ch; line-height: 1.2; }
  p { font-size: 24px; color: #545454; max-width: 34ch; line-height: 1.5; }
  .canales { display: flex; gap: 12px; margin-top: 8px; }
  .canal { background: #FFFFFF; color: #040764; border-radius: 8px; padding: 12px 20px; font-size: 18px; font-weight: 500; }
  .arte { position: relative; height: 100%; background: #040764; display: flex; align-items: center; justify-content: center; }
  .arte .icono { width: 380px; height: auto; }
  .arte .franja { position: absolute; left: 0; bottom: 0; width: 100%; height: 120px; background: #20B6B6; }
  .arte .franja span { display: block; padding: 42px 60px; color: #040764; font-size: 20px; font-weight: 500; }
</style></head>
<body>
  <section class="texto">
    <img src="${BASE}/brand/flash-campaign/logo_flash_campaign.svg" alt="Flash Campaign">
    <h1>Anuncios y campañas digitales, listos en una sola pasada</h1>
    <p>Un lienzo base de 300 × 250 se convierte en 19 formatos, y Char B resuelve los anuncios de búsqueda.</p>
    <div class="canales">
      <span class="canal">Google Search</span>
      <span class="canal">Google Display</span>
      <span class="canal">Meta</span>
    </div>
  </section>
  <section class="arte">
    <img class="icono" src="${BASE}/brand/flash-campaign/icono_flash_campaign_blanco.svg" alt="">
    <div class="franja"><span>Desarrollado por Gamonal</span></div>
  </section>
</body></html>`

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } })
await pagina.goto(`${BASE}/login`)
await pagina.setContent(HTML, { waitUntil: 'networkidle' })
await pagina.evaluate(() => document.fonts.ready)
await pagina.waitForTimeout(800)
await pagina.screenshot({ path: `${SALIDA}/portada_presentacion_flash_campaign.jpg`, type: 'jpeg', quality: 95 })
console.log('✓', `${SALIDA}/portada_presentacion_flash_campaign.jpg`)
await navegador.close()
