/**
 * Doble de pruebas para verificar el flujo completo de Char B sin gastar la clave
 * real: sirve una página de promoción de ejemplo y responde como la API de Gemini.
 * Devuelve textos deliberadamente demasiado largos para comprobar que el
 * aplicativo recorta a los límites de Google Ads.
 */
import { createServer } from 'node:http'

const PUERTO = Number(process.env.PUERTO ?? 8899)

const PAGINA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Seguro de Auto Todo Riesgo — Zurich Chile</title>
<meta name="description" content="Contrata online tu seguro de auto todo riesgo con 2 cuotas gratis. Deducible UF 10.">
</head><body>
<h1>Seguro Auto Digital</h1>
<p>Cobertura todo riesgo con deducible desde UF 5. Contratación 100% online en 5 minutos.</p>
<ul><li>2 cuotas gratis en los meses 6 y 9</li><li>Asistencia en ruta 24/7</li><li>Auto de reemplazo</li></ul>
<p>Planes desde $28.864 mensuales para Volkswagen Gol año 2026.</p>
</body></html>`

const RESPUESTA = {
  resumen: {
    producto: 'Seguro de auto todo riesgo Auto Digital, contratable 100% online.',
    propuestaValor: 'Dos cuotas gratis y deducible bajo, con contratación en cinco minutos.',
    publico: 'Conductores de 25 a 55 años que cotizan seguro en línea y comparan precio y deducible.',
    competencia: ['BCI Seguros', 'HDI', 'Mapfre', 'Comparadores de seguros'],
    aprendizajes: [
      'La página confirma 2 cuotas gratis en los meses 6 y 9.',
      'El precio de referencia publicado es $28.864 mensuales.',
    ],
  },
  grupos: [
    {
      nombre: 'Auto todo riesgo · genérico',
      tema: 'Intención de compra directa de seguro todo riesgo',
      titulos: [
        'Seguro Auto Todo Riesgo',
        'Este título es demasiado largo y debe ser recortado por el aplicativo',
        'Cotiza online en 5 minutos',
        '2 cuotas gratis',
        'Desde $28.864 al mes',
        'Deducible UF 10',
        'Auto de reemplazo incluido',
        'Asistencia en ruta 24/7',
        'Contrata 100% online',
        'Seguro de auto Zurich',
        'Cotiza sin llamadas',
        'Cobertura todo riesgo',
        'Paga en 12 cuotas',
        'Protege tu auto hoy',
        'Contrata en 5 minutos',
      ],
      descripciones: [
        'Contrata tu seguro de auto todo riesgo online y aprovecha 2 cuotas gratis en los meses 6 y 9.',
        'Deducible UF 10, auto de reemplazo y asistencia en ruta 24/7. Cotiza en 5 minutos.',
        'Planes desde $28.864 mensuales. Sin papeleo ni llamadas.',
        'Cobertura todo riesgo respaldada por Zurich. Cotiza y contrata el mismo día.',
      ],
      rutas: ['seguro-auto', 'estaRutaEsDemasiadoLarga'],
      palabrasClave: {
        amplia: ['seguro de auto', 'seguro todo riesgo', 'cotizar seguro automotriz'],
        frase: ['"seguro de auto todo riesgo"', '"contratar seguro auto online"'],
        exacta: ['[seguro auto todo riesgo]', '[cotizar seguro de auto]'],
      },
    },
    {
      nombre: 'Promoción · 2 cuotas gratis',
      tema: 'Usuarios sensibles al precio y a la promoción vigente',
      titulos: ['2 cuotas gratis', 'Ahorra en tu seguro', 'Promoción por tiempo limitado'],
      descripciones: ['Aprovecha 2 cuotas gratis contratando tu seguro de auto online.'],
      rutas: ['promocion'],
      palabrasClave: {
        amplia: ['seguro auto barato'],
        frase: ['"seguro auto promocion"'],
        exacta: ['[seguro auto 2 cuotas gratis]'],
      },
    },
  ],
  palabrasNegativas: ['gratis', 'trabajo', 'empleo', 'siniestro', 'reclamo', 'curso', 'tramite'],
  extensiones: {
    sitelinks: [
      {
        titulo: 'Cotiza tu seguro ahora mismo sin esperar',
        descripcion1: 'Simulación online en menos de cinco minutos',
        descripcion2: 'Sin llamadas ni papeleo adicional',
        url: 'https://www.zurich.cl/seguros/auto',
      },
    ],
    textosDestacados: ['Contratación 100% online', 'Asistencia 24/7', 'Auto de reemplazo'],
    fragmentos: [{ encabezado: 'Coberturas', valores: ['Todo riesgo', 'Robo', 'Daños a terceros'] }],
  },
  recomendaciones: [
    'Activa la extensión de promoción con la fecha de término de las 2 cuotas gratis.',
    'Separa la campaña de marca de la de competencia para controlar el CPA.',
  ],
}

createServer((peticion, respuesta) => {
  const url = new URL(peticion.url ?? '/', `http://127.0.0.1:${PUERTO}`)

  if (url.pathname === '/promo') {
    respuesta.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    respuesta.end(PAGINA)
    return
  }

  if (url.pathname.includes(':generateContent')) {
    let cuerpo = ''
    peticion.on('data', (trozo) => (cuerpo += trozo))
    peticion.on('end', () => {
      const recibido = JSON.parse(cuerpo || '{}')
      const prompt = recibido.contents?.[0]?.parts?.[0]?.text ?? ''
      // Deja constancia de que el prompt llegó con el contenido leído de la página.
      console.log('[stub] prompt recibido:', prompt.length, 'caracteres · página leída:', prompt.includes('Auto Digital'))
      respuesta.writeHead(200, { 'content-type': 'application/json' })
      respuesta.end(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(RESPUESTA) }] } }] }),
      )
    })
    return
  }

  respuesta.writeHead(404, { 'content-type': 'application/json' })
  respuesta.end(JSON.stringify({ error: { message: 'ruta no encontrada en el doble de pruebas' } }))
}).listen(PUERTO, '127.0.0.1', () => console.log(`[stub] escuchando en http://127.0.0.1:${PUERTO}`))
