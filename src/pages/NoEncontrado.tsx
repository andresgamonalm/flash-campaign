import { useNavigate } from 'react-router-dom'
import { Boton, EstadoVacio } from '../components/ui'

export function NoEncontrado() {
  const navegar = useNavigate()
  return (
    <EstadoVacio
      titulo="Esta página no existe"
      descripcion="La dirección que abriste no corresponde a ninguna sección del aplicativo. Vuelve al inicio para seguir trabajando."
      accion={<Boton onClick={() => navegar('/')}>Ir al inicio</Boton>}
    />
  )
}
