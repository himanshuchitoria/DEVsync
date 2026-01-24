// frontend/src/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  // ❌ REMOVED React.StrictMode (causing double renders → infinite loop)
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
  // ✅ Single render → Clean socket events → Presence works!
);
