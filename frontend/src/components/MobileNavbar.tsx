// frontend/src/components/MobileNavbar.tsx
import React, { useState } from 'react'
import { useAuthContext } from '../context/useAuthContext'
import type { ProjectFile } from '../types/api'

interface MobileNavbarProps {
  files: ProjectFile[]
  activeFileId?: string
  onFileSelect: (file: ProjectFile) => void
  onToggleFileTree: () => void
}

const MobileNavbar: React.FC<MobileNavbarProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onToggleFileTree,
}) => {
  const { user } = useAuthContext()
  const [showFileMenu, setShowFileMenu] = useState(false)

  const activeFile = files.find(f => f.id === activeFileId)

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 z-50">
      {/* Main Nav */}
      <div className="flex items-center justify-between px-4 py-3 h-16 max-w-4xl mx-auto">
        {/* Left: File name + menu */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <button
            onClick={onToggleFileTree}
            className="p-2 hover:bg-gray-800/50 rounded-xl transition-colors lg:hidden"
            aria-label="Toggle file tree"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="flex items-center space-x-2 p-2 hover:bg-gray-800/50 rounded-xl transition-colors text-left min-w-0 flex-1"
            >
              <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/30">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="truncate text-sm font-medium text-white max-w-[120px]">
                {activeFile?.name || 'No file'}
              </span>
              <svg className={`w-4 h-4 transition-transform ${showFileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* File Menu */}
            {showFileMenu && (
              <div className="absolute bottom-12 left-0 w-64 bg-gray-900/95 border border-gray-800 rounded-2xl shadow-2xl py-2 z-10 backdrop-blur-xl max-h-64 overflow-y-auto">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h4 className="text-sm font-semibold text-gray-300">Files ({files.length})</h4>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        onFileSelect(file)
                        setShowFileMenu(false)
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-all duration-200 ${
                        activeFileId === file.id
                          ? 'bg-emerald-500/20 border-r-2 border-emerald-500 text-emerald-300 font-medium'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{file.language}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* User Avatar */}
          {user && (
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-xs font-semibold text-white">
                {user.displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex space-x-1">
            <button className="p-2 hover:bg-gray-800/50 rounded-xl transition-all duration-200 group relative">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg z-10">
                Save
              </div>
            </button>
            
            <button className="p-2 hover:bg-gray-800/50 rounded-xl transition-all duration-200 group relative">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4 2 2 0 000 4zm0 0h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg z-10">
                Settings
              </div>
            </button>

            <button className="p-2 hover:bg-gray-800/50 rounded-xl transition-all duration-200 group relative">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg z-10">
                Share
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* File Tree Toggle Indicator */}
      <div className="h-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
    </div>
  )
}

export default MobileNavbar
