// frontend/src/components/FileTree.tsx
import React from 'react'
import { useFileTree, type FileNode } from '../hooks/useFileTree'
import type { CreateFileRequest } from '../types/api'

interface FileTreeProps {
  projectId: string
  onFileSelect: (file: FileNode) => void
  activeFileId?: string
}

const FileTree: React.FC<FileTreeProps> = ({ projectId, onFileSelect, activeFileId }) => {
  const {
    files,
    loading,
    createFile,
    handleDragStart,
    handleDragOver,
    handleDrop,
    toggleFolder,
    fetchFiles, // Add this to trigger manual fetch
  } = useFileTree(projectId)

  // ✅ FIX: Fetch files on mount to show existing files immediately
  React.useEffect(() => {
    fetchFiles()
  }, [projectId, fetchFiles])

  const [showNewFile, setShowNewFile] = React.useState(false)
  const [newFileName, setNewFileName] = React.useState('')
  const [isFolder, setIsFolder] = React.useState(false)

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newFileName.trim()
    if (!trimmed) return

    let name = trimmed
    let path = trimmed
    let language: string
    let content: string | undefined

    if (isFolder) {
      if (!name.endsWith('/')) {
        name = `${name}/`
        path = `${path}/`
      }
      language = 'folder'
      content = ''
    } else {
      const ext = trimmed.split('.').pop()?.toLowerCase()
      language =
        ext === 'ts' || ext === 'tsx'
          ? 'typescript'
          : ext === 'js' || ext === 'jsx'
          ? 'javascript'
          : ext === 'py'
          ? 'python'
          : 'plaintext'
      content = '// Start coding...\n'
    }

    const data: CreateFileRequest = {
      name,
      path,
      language,
      content,
    }

    const success = await createFile(data)
    if (success) {
      setShowNewFile(false)
      setNewFileName('')
    }
  }

  const getIcon = (file: FileNode) => {
    if (file.isFolder) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4S17.21 3 15 3H9c-2.21 0-4 1.79-4 4z"
          />
        </svg>
      )
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    const icons: Record<string, string> = {
      ts: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      js: 'M13 10V3L4 14h7v7l9-11h-7z',
      py: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l9.91-1.01z',
      json: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z',
      md: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z',
      default:
        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={icons[ext || 'default']}
        />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-12 border-b border-gray-800">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white truncate">Files</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowNewFile(true)
              setIsFolder(false)
            }}
            className="p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors"
            title="New File"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => {
              setShowNewFile(true)
              setIsFolder(true)
            }}
            className="p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors"
            title="New Folder"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM12 10v6m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* New File Modal */}
      {showNewFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 border border-gray-800 rounded-2xl p-6 w-80 max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">
              {isFolder ? 'New Folder' : 'New File'}
            </h3>
            <form onSubmit={handleCreateFile} className="space-y-4">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={isFolder ? 'my-folder' : 'index.ts'}
                autoFocus
              />
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-2 px-4 rounded-xl transition-all"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFile(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 rounded-xl hover:border-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <p className="text-sm font-medium">No files yet</p>
            <p className="text-xs">Create your first file to start coding</p>
          </div>
        ) : (
          files.map((file) => (
            <FileTreeNode
              key={file.id}
              file={file}
              level={0}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onToggleFolder={toggleFolder}
              getIcon={getIcon}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface FileTreeNodeProps {
  file: FileNode
  level: number
  activeFileId?: string
  onFileSelect: (file: FileNode) => void
  onDragStart: (file: FileNode) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (file: FileNode) => void
  onToggleFolder: (fileId: string) => void
  getIcon: (file: FileNode) => React.ReactNode
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  file,
  level,
  activeFileId,
  onFileSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleFolder,
  getIcon,
}) => {
  const isActive = activeFileId === file.id
  const hasChildren = file.children && file.children.length > 0

  return (
    <div className="space-y-0.5">
      <div
        className={`group flex items-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:bg-gray-800/50 ${
          isActive
            ? 'bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-300 font-medium'
            : 'text-gray-400 hover:text-white hover:border-gray-700 border border-transparent'
        }`}
        draggable={!file.isFolder}
        onDragStart={(e) => !file.isFolder && onDragStart(file)}
        onDragOver={onDragOver}
        onDrop={() => onDrop(file)}
        onClick={() => !file.isFolder && onFileSelect(file)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFolder(file.id)
            }}
            className={`mr-2 p-1 rounded transition-colors ${
              file.isOpen ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-gray-500 hover:bg-gray-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d={file.isOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
              />
            </svg>
          </button>
        )}
        <div className="mr-3 flex-shrink-0">{getIcon(file)}</div>
        <span className="truncate text-sm flex-1 font-medium">{file.name}</span>
        {file.isFolder && (
          <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
            {file.children?.length || 0}
          </span>
        )}
      </div>

      {file.isOpen && hasChildren && (
        <div className="ml-6 space-y-0.5">
          {file.children!.map((child) => (
            <FileTreeNode
              key={child.id}
              file={child}
              level={level + 1}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onToggleFolder={onToggleFolder}
              getIcon={getIcon}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default FileTree
