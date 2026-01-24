// frontend/src/hooks/useMobileTree.ts
import { useState, useEffect, useCallback } from 'react'
import { useFileTree, type FileNode } from './useFileTree'

interface UseMobileTreeProps {
  projectId: string
}

interface UseMobileTreeReturn {
  isOpen: boolean
  files: FileNode[]
  activeFileId: string | null
  setActiveFileId: (id: string | null) => void
  toggle: () => void
  close: () => void
  onFileSelect: (file: FileNode) => void
  fileTreeLoading: boolean
}

export const useMobileTree = ({ projectId }: UseMobileTreeProps): UseMobileTreeReturn => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  const {
    files,
    loading: fileTreeLoading,
    fetchFiles,
  } = useFileTree(projectId)

  // Auto-fetch files when mobile tree opens
  useEffect(() => {
    if (isOpen) {
      fetchFiles()
    }
  }, [isOpen, fetchFiles])

  // Close on escape key or outside click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleOverlayClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('mobile-tree-overlay')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('click', handleOverlayClick)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('click', handleOverlayClick)
    }
  }, [isOpen])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const onFileSelect = useCallback((file: FileNode) => {
    setActiveFileId(file.id)
    setIsOpen(false) // Auto-close after selection
  }, [])

  return {
    isOpen,
    files,
    activeFileId,
    setActiveFileId,
    toggle,
    close,
    onFileSelect,
    fileTreeLoading,
  }
}
