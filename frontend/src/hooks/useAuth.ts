// frontend/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface User {
  id: string
  email: string
  displayName: string
  role: 'user' | 'admin'
}

interface AuthResponse {
  user: User
  accessToken: string
}

// API base for HTTP
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Helper: derive Socket.IO base URL from API_BASE
// e.g. VITE_API_URL = "http://localhost:3000/api"  →  SOCKET_BASE = "http://localhost:3000"
const getSocketBase = () => {
  if (API_BASE.startsWith('http')) {
    return API_BASE.replace(/\/api\/?$/, '')
  }
  // When using proxy (Vite dev) and API_BASE = '/api', backend is usually same origin at 3000
  return 'http://localhost:3000'
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [socket, setSocket] = useState<Socket | null>(null)

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  // ✅ Central place to create/destroy authenticated socket when token changes
  useEffect(() => {
    // If no token, ensure no socket
    if (!token) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }

    const SOCKET_BASE = getSocketBase()
    const newSocket = io(SOCKET_BASE, {
      auth: { token },           // matches socketAuth.ts expectations
      withCredentials: true,
      transports: ['websocket'], // backend allows websocket transport
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id)
    })

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connect_error:', err.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [token]) // re-run whenever token changes

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const data: AuthResponse = await response.json()

    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('user', JSON.stringify(data.user))

    setUser(data.user)
    setToken(data.accessToken) // 🔁 triggers socket creation via useEffect

    return data
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthResponse> => {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      })

      if (!response.ok) {
        throw new Error('Registration failed')
      }

      const data: AuthResponse = await response.json()

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))

      setUser(data.user)
      setToken(data.accessToken) // 🔁 triggers socket creation via useEffect

      return data
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null) // 🔁 token → null will tear down the socket via useEffect
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
  }, [socket])

  return {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    socket,
  }
}
