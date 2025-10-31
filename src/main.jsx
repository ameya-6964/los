import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { BreProvider } from './contexts/BreContext.jsx'
import { LeadsProvider } from './contexts/LeadsContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <BreProvider>
        <LeadsProvider>
          <App />
        </LeadsProvider>
      </BreProvider>
    </ToastProvider>
  </React.StrictMode>,
)