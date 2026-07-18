import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initPwaUpdate } from './pwaUpdate'
import './index.css'
import './i18n'
import App from './App.jsx'

initPwaUpdate()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
