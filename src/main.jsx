import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Tienda from './components/Tienda.jsx'

// Detect Tienda mode cleanly via query param (?tienda=1 or ?v=tienda), hash (#tienda), or pathname ending in /tienda
const pathname = window.location.pathname.toLowerCase();
const search = window.location.search.toLowerCase();
const hash = window.location.hash.toLowerCase();

const isTienda = pathname.endsWith('/tienda') || 
                 pathname.endsWith('/tienda/') || 
                 search.includes('tienda') || 
                 hash.includes('tienda');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isTienda ? <Tienda /> : <App />}
  </StrictMode>,
)
