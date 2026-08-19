import { useCallback, useEffect, useState } from 'react'
import { api, type ConsumoIa } from '../lib/api'

/**
 * Consumo de Char B.
 *
 * Google no avisa de que la cuota se agota: deja de responder y el trabajo se
 * corta a mitad. Este panel muestra los tokens que la propia API informa en cada
 * generación, para poder anticiparlo en vez de descubrirlo por las malas.
 *
 * Se refresca cuando cambia `marca`, de modo que el editor lo actualice tras
 * cada generación sin tener que recargar la pantalla.
 */

const LIMITE_ORIENTATIVO_DIA = 1_000_000

function miles(n: number): string {
  return n.toLocaleString('es-CL')
}

export function ConsumoCharB({ marca }: { marca?: unknown }) {
  const [consumo, setConsumo] = useState<ConsumoIa | null>(null)

  const cargar = useCallback(async () => {
    try {
      setConsumo(await api.consumoIa())
    } catch {
      // El contador es informativo: si no se puede leer, la pantalla sigue igual.
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar, marca])

  if (!consumo || consumo.total.generaciones === 0) return null

  const proporcion = Math.min(1, consumo.hoy.tokens / LIMITE_ORIENTATIVO_DIA)
  return (
    <section className="consumo" aria-label="Consumo de Char B">
      <h3>Consumo de Char B</h3>

      <dl className="consumo__cifras">
        <div>
          <dt>Hoy</dt>
          <dd>
            {miles(consumo.hoy.tokens)} <span>tokens</span>
          </dd>
          <p>{consumo.hoy.generaciones} generación(es)</p>
        </div>
        <div>
          <dt>Este mes</dt>
          <dd>
            {miles(consumo.mes.tokens)} <span>tokens</span>
          </dd>
          <p>{consumo.mes.generaciones} generación(es)</p>
        </div>
        <div>
          <dt>Desde el inicio</dt>
          <dd>
            {miles(consumo.total.tokens)} <span>tokens</span>
          </dd>
          <p>{consumo.total.generaciones} generación(es)</p>
        </div>
      </dl>

      <div
        className="consumo__barra"
        role="progressbar"
        aria-valuenow={Math.round(proporcion * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Consumo de hoy sobre la referencia diaria"
      >
        <span style={{ width: `${Math.max(2, proporcion * 100)}%` }} />
      </div>
      <p className="consumo__nota">
        La referencia diaria es orientativa ({miles(LIMITE_ORIENTATIVO_DIA)} tokens): el límite real depende del plan
        de tu clave en Google AI Studio. Si Google responde que se agotó la cuota, Char B te lo dirá con esas palabras
        y cuántos segundos hay que esperar.
      </p>

      {consumo.porUsuario.length > 1 ? (
        <table className="tabla tabla--compacta">
          <caption className="visually-hidden">Consumo por persona</caption>
          <thead>
            <tr>
              <th scope="col">Cuenta</th>
              <th scope="col">Generaciones</th>
              <th scope="col">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {consumo.porUsuario.map((u) => (
              <tr key={u.email}>
                <td>{u.email}</td>
                <td>{u.generaciones}</td>
                <td>{miles(u.tokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  )
}
