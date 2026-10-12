import React from 'react'
import ReactDOM from 'react-dom/client'
import AllRolesPreview from '../../design-preview/AllRolesPreview'

// Entrada aislada solo para revisar el diseño (design-preview.html).
// No pasa por MvpApp ni por las rutas de producción.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AllRolesPreview />
  </React.StrictMode>,
)
