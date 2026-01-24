// frontend/src/components/Navbar.tsx
import React, { useState, useEffect } from 'react'
import { useAuthContext } from '../context/useAuthContext'
import { roomAPI } from '../config/apiClient'
import { Link, useNavigate } from 'react-router-dom'
import type { Room } from '../types/api'

const Navbar: React.FC = () => {
  const { user, logout, socket } = useAuthContext()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return

    const fetchRooms = async () => {
      try {
        const { data } = await roomAPI.list()
        setRooms(data.rooms)
      } catch (error) {
        console.error('Failed to fetch rooms:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="fixed lg:static lg:translate-x-0 inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 shadow-2xl lg:shadow-none transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out">
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => {}} />
      
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                CodeCollab
              </h2>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Search + Actions */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Search rooms..."
              className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="p-2 hover:bg-gray-800 rounded-xl transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <button className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
            + New Room
          </button>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2 mb-2">
            Your Rooms
          </div>
          {loading ? (
            <div className="flex items-center space-x-3 px-4 py-4 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">Loading rooms...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">No rooms yet</p>
              <p className="text-xs">Create your first room to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/dashboard/room/${room.id}`}
                  className="group flex items-center px-4 py-3 rounded-xl hover:bg-gray-800/50 border border-transparent hover:border-gray-700 transition-all duration-200"
                >
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 mr-3 group-hover:scale-110 transition-transform"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{room.name}</p>
                    {room.description && (
                      <p className="text-xs text-gray-500 truncate">{room.description}</p>
                    )}
                  </div>
                  {room.isTrusted && (
                    <div className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 font-medium">
                      Trusted
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 p-3 hover:bg-gray-800/50 rounded-xl transition-colors cursor-pointer" onClick={handleLogout}>
            <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl flex items-center justify-center">
              <span className="text-sm font-semibold text-white">{user?.displayName?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Navbar
