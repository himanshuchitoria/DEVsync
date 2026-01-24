// frontend/src/App.tsx
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthContext } from './context/useAuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import RoomPage from './pages/RoomPage'
import ProjectPage from './pages/ProjectPage'
import Navbar from './components/Navbar'

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthContext()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected dashboard routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <div className="flex">
                <Navbar />
                <main className="flex-1 ml-0 lg:ml-64 min-h-screen">
                  <Routes>
                    <Route index element={<DashboardPage />} />
                    <Route path="room/:roomId" element={<RoomPage />} />
                    <Route path="project/:projectId" element={<ProjectPage />} />
                    <Route path="*" element={<DashboardPage />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Root redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

const App: React.FC = () => {
  return <AppContent />
}

export default App
