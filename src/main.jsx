import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { BreProvider } from './contexts/BreContext.jsx'
import { LeadsProvider } from './contexts/LeadsContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider> 
        <BreProvider>
          <LeadsProvider>
            <App />
          </LeadsProvider>
        </BreProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
)