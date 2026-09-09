import React from 'react'
import ReactDOM from 'react-dom/client'
import { MvpApp } from './mvp/MvpApp'
import './mvp/ugo-senior-ui.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MvpApp />
  </React.StrictMode>,
)
