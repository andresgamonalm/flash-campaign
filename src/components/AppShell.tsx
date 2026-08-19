import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Icono, type NombreIcono } from './Icono'
import { Boton } from './ui'
import { useSesion } from '../lib/sesion'

interface Destino {
  ruta: string
  nombre: string
  icono: NombreIcono
  soloAdmin?: boolean
  exacta?: boolean
}

const DESTINOS: Destino[] = [
  { ruta: '/', nombre: 'Inicio', icono: 'campana', exacta: true },
  { ruta: '/campanas/nueva', nombre: 'Crear campaña', icono: 'mas' },
  { ruta: '/proyectos', nombre: 'Proyectos en curso', icono: 'proyectos' },
  { ruta: '/proyectos/realizados', nombre: 'Proyectos realizados', icono: 'realizados' },
  { ruta: '/marcas', nombre: 'Marcas', icono: 'marcas' },
  { ruta: '/biblioteca', nombre: 'Biblioteca de imágenes', icono: 'biblioteca' },
  { ruta: '/historial', nombre: 'Historial', icono: 'historial' },
  { ruta: '/configuracion', nombre: 'Configuración', icono: 'configuracion' },
  { ruta: '/usuarios', nombre: 'Usuarios', icono: 'usuarios', soloAdmin: true },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { usuario, esAdmin, salir, estadoServicio } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const ubicacion = useLocation()
  const navegar = useNavigate()

  useEffect(() => {
    setAbierto(false)
  }, [ubicacion.pathname])

  const visibles = DESTINOS.filter((d) => !d.soloAdmin || esAdmin)

  // Las pantallas de trabajo cuelgan de una campaña y no tienen entrada propia
  // en el menú, pero sí necesitan nombrarse en la barra superior.
  const seccion = ubicacion.pathname.endsWith('/editor')
    ? 'Editor de banners'
    : ubicacion.pathname.endsWith('/search')
      ? 'Anuncios de Google Search'
      : (visibles.find((d) => (d.exacta ? d.ruta === ubicacion.pathname : ubicacion.pathname.startsWith(d.ruta)))?.nombre ??
        'Flash Campaign')

  return (
    <div className={`shell${abierto ? ' shell--menu-abierto' : ''}`}>
      <a className="saltar-al-contenido" href="#contenido">
        Saltar al contenido
      </a>

      <aside className="shell__lateral" id="navegacion-principal">
        <div className="shell__marca">
          <img src="/brand/flash-campaign/logo_flash_campaign_blanco.svg" alt="Flash Campaign" height={34} />
        </div>

        <nav className="shell__nav" aria-label="Secciones del aplicativo">
          {visibles.map((d) => (
            <NavLink
              key={d.ruta}
              to={d.ruta}
              end={d.exacta}
              className={({ isActive }) => `shell__enlace${isActive ? ' shell__enlace--activo' : ''}`}
            >
              <Icono nombre={d.icono} tamano={20} />
              <span>{d.nombre}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell__pie">
          <p className="shell__endoso">Pensado y creado por</p>
          <img src="/brand/gamonal/logo_gamonal_blanco.png" alt="Gamonal" className="logo-endoso" />
        </div>
      </aside>

      {abierto ? <div className="shell__velo" onClick={() => setAbierto(false)} aria-hidden="true" /> : null}

      <header className="shell__barra">
        <button
          type="button"
          className="shell__menu"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="navegacion-principal"
        >
          <Icono nombre="menu" tamano={22} />
          <span className="visually-hidden">Abrir menú de secciones</span>
        </button>

        <h1 className="shell__titulo">{seccion}</h1>

        <div className="shell__acciones">
          {estadoServicio && !estadoServicio.almacenamiento.persistente ? (
            <span className="chip chip--alerta" title="Enlaza el espacio KV FLASH_KV en Cloudflare para conservar los datos.">
              <Icono nombre="alerta" tamano={14} />
              Almacenamiento temporal
            </span>
          ) : null}
          <div className="shell__usuario">
            <span className="shell__usuario-nombre">{usuario?.nombre}</span>
            <span className={`chip ${esAdmin ? 'chip--marca' : ''}`}>{esAdmin ? 'Administrador' : 'Usuario'}</span>
          </div>
          <Boton
            variante="secundario"
            icono="salir"
            pequeno
            onClick={async () => {
              await salir()
              navegar('/login')
            }}
          >
            Salir
          </Boton>
        </div>
      </header>

      <main className="shell__contenido" id="contenido" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
