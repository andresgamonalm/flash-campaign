import { conSesion, json, type Env } from '../../_lib/entorno'
import { listarHistorial } from '../../_lib/historial'

/**
 * Cuánto lleva consumido Char B.
 *
 * Google no avisa de que la cuota se agota: simplemente deja de responder. Aquí
 * se suman los tokens que la propia API informa en cada generación, para poder
 * ver el gasto acumulado antes de quedarse sin servicio a mitad de un trabajo.
 *
 * El administrador ve el total del aplicativo y el desglose por persona; cada
 * usuario ve sólo lo suyo.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) =>
  conSesion(request, env, async (sesion) => {
    const eventos = (await listarHistorial(env)).filter((e) => e.tipo === 'search_generado')
    const mios = eventos.filter((e) => e.usuarioId === sesion.uid)
    const visibles = sesion.rol === 'admin' ? eventos : mios

    const inicioDelDia = new Date()
    inicioDelDia.setHours(0, 0, 0, 0)
    const inicioDelMes = new Date(inicioDelDia)
    inicioDelMes.setDate(1)

    const sumar = (lista: typeof eventos) => lista.reduce((total, e) => total + (e.tokens ?? 0), 0)
    const desde = (lista: typeof eventos, fecha: Date) =>
      lista.filter((e) => new Date(e.creadoEn).getTime() >= fecha.getTime())

    const porUsuario = new Map<string, { email: string; generaciones: number; tokens: number }>()
    for (const e of visibles) {
      const previo = porUsuario.get(e.usuarioId) ?? { email: e.usuarioEmail, generaciones: 0, tokens: 0 }
      previo.generaciones += 1
      previo.tokens += e.tokens ?? 0
      porUsuario.set(e.usuarioId, previo)
    }

    return json({
      hoy: { generaciones: desde(visibles, inicioDelDia).length, tokens: sumar(desde(visibles, inicioDelDia)) },
      mes: { generaciones: desde(visibles, inicioDelMes).length, tokens: sumar(desde(visibles, inicioDelMes)) },
      total: { generaciones: visibles.length, tokens: sumar(visibles) },
      ultima: visibles[0] ? { creadoEn: visibles[0].creadoEn, tokens: visibles[0].tokens ?? 0 } : null,
      porUsuario: sesion.rol === 'admin' ? [...porUsuario.values()].sort((a, b) => b.tokens - a.tokens) : [],
    })
  })
