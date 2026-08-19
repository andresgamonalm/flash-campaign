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
    if (modelo.startsWith('gemini-3.7')) {
      // Se cuelga: nunca contesta.
      return
    }
    if (modelo.startsWith('gemini-3')) {
      respuesta.writeHead(404, { 'content-type': 'application/json' })
      return respuesta.end(JSON.stringify({ error: { message: 'model not found' } }))
    }
    respuesta.writeHead(200, { 'content-type': 'application/json' })
    respuesta.end(JSON.stringify(RESPUESTA))
  })
}).listen(8898, '127.0.0.1', () => console.log('doble lento en 8898'))
