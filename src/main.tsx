import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-600.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/editor.css'

import { App } from './App'
import { ProveedorSesion } from './lib/sesion'
import { ProveedorTostadas } from './components/ui'

const contenedor = document.getElementById('root')
if (!contenedor) throw new Error('No se encontró el contenedor #root en el documento.')

createRoot(contenedor).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorTostadas>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </ProveedorTostadas>
    </BrowserRouter>
  </StrictMode>,
)
