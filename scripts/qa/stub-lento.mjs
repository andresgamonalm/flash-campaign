/**
 * Doble de pruebas de Gemini que se comporta mal a propósito.
 *
 * Reproduce lo que ocurre en producción: un modelo que no existe para la clave y
 * otro que tarda más de lo que la plataforma tolera. Sirve para comprobar que el
 * aplicativo responde con una explicación y no con un 502 sin texto.
 */
import { createServer } from 'node:http'

const RESPUESTA = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              resumen: {
                producto: 'Seguro de auto todo riesgo',
                propuestaValor: '2 cuotas gratis contratando online',
                publico: 'Conductores en Chile',
                competencia: ['BCI Seguros'],
                aprendizajes: ['La promoción es por tiempo limitado'],
              },
              grupos: [
                {
                  nombre: 'Auto todo riesgo',
                  tema: 'Promoción',
                  titulos: ['Seguro de Auto Zurich'],
                  descripciones: ['Contrata 100% online y aprovecha 2 cuotas gratis.'],
                  palabrasClave: [{ texto: 'seguro de auto', concordancia: 'frase' }],
                  negativas: ['gratis total'],
                  rutas: ['auto'],
                  sitelinks: [{ titulo: 'Cotiza online', descripcion: 'En 3 minutos' }],
                  destacados: ['Cobertura total'],
                },
              ],
              recomendaciones: ['Revisar los términos legales'],
            }),
          },
        ],
      },
    },
  ],
}

createServer((peticion, respuesta) => {
  const modelo = /models\/([^:]+):/.exec(peticion.url ?? '')?.[1] ?? ''
  let cuerpo = ''
  peticion.on('data', (t) => (cuerpo += t))
  peticion.on('end', () => {
    // Con TODOS_SIN_CUOTA=1 ninguna versión tiene crédito: es el caso que ve el
    // usuario cuando de verdad se le acabó la cuota de Google.
    if (process.env.TODOS_SIN_CUOTA === '1') {
      respuesta.writeHead(429, { 'content-type': 'application/json' })
      return respuesta.end(
        JSON.stringify({
          error: { code: 429, message: 'You exceeded your current quota', details: [{ retryDelay: '52s' }] },
        }),
      )
    }
    // gemini-flash-latest: cuota agotada, como responde Google de verdad.
    if (modelo === 'gemini-flash-latest') {
      respuesta.writeHead(429, { 'content-type': 'application/json' })
      return respuesta.end(
        JSON.stringify({
          error: {
            code: 429,
            message: 'You exceeded your current quota',
            details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '37s' }],
          },
        }),
      )
    }
    // gemini-pro-latest: se cuelga y nunca contesta.
    if (modelo === 'gemini-pro-latest') return
    // Modelo inexistente para esta cuenta.
    if (modelo.startsWith('gemini-3')) {
      respuesta.writeHead(404, { 'content-type': 'application/json' })
      return respuesta.end(JSON.stringify({ error: { message: 'model not found' } }))
    }
    respuesta.writeHead(200, { 'content-type': 'application/json' })
    respuesta.end(JSON.stringify(RESPUESTA))
  })
}).listen(Number(process.env.PUERTO ?? 8898), '127.0.0.1', () => console.log('doble lento en 8898'))
