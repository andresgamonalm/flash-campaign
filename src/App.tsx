import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Cargando } from './components/ui'
import { useSesion } from './lib/sesion'
import { Login } from './pages/Login'
import { Inicio } from './pages/Inicio'
import { NuevaCampana } from './pages/NuevaCampana'
import { Proyectos } from './pages/Proyectos'
import { CreadorSearch } from './pages/CreadorSearch'
import { Editor } from './pages/Editor'
import { Marcas } from './pages/Marcas'
import { Biblioteca } from './pages/Biblioteca'
import { Historial } from './pages/Historial'
import { Configuracion } from './pages/Configuracion'
import { Usuarios } from './pages/Usuarios'
import { NoEncontrado } from './pages/NoEncontrado'

function Privado({ children, soloAdmin = false }: { children: React.ReactNode; soloAdmin?: boolean }) {
  const { usuario, cargando, esAdmin } = useSesion()
  const ubicacion = useLocation()

  if (cargando) return <Cargando texto="Comprobando tu sesión…" />
  if (!usuario) return <Navigate to="/login" state={{ desde: ubicacion.pathname }} replace />
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />
  return <AppShell>{children}</AppShell>
}

export function App() {
  const { usuario, cargando } = useSesion()

  return (
    <Routes>
      <Route path="/login" element={cargando ? <Cargando /> : usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Privado><Inicio /></Privado>} />
      <Route path="/campanas/nueva" element={<Privado><NuevaCampana /></Privado>} />
      <Route path="/proyectos" element={<Privado><Proyectos estado="en_curso" /></Privado>} />
      <Route path="/proyectos/realizados" element={<Privado><Proyectos estado="realizado" /></Privado>} />
      <Route path="/campanas/:id/search" element={<Privado><CreadorSearch /></Privado>} />
      <Route path="/campanas/:id/editor" element={<Privado><Editor /></Privado>} />
      <Route path="/marcas" element={<Privado><Marcas /></Privado>} />
      <Route path="/biblioteca" element={<Privado><Biblioteca /></Privado>} />
      <Route path="/historial" element={<Privado><Historial /></Privado>} />
      <Route path="/configuracion" element={<Privado><Configuracion /></Privado>} />
      <Route path="/usuarios" element={<Privado soloAdmin><Usuarios /></Privado>} />
      <Route path="*" element={<Privado><NoEncontrado /></Privado>} />
    </Routes>
  )
}
