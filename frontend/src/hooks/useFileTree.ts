// frontend/src/hooks/useFileTree.ts
import { useState, useCallback, useEffect } from 'react';
import { fileAPI } from '../config/apiClient';
import type { ProjectFile, CreateFileRequest } from '../types/api';

export interface FileNode extends ProjectFile {
  children?: FileNode[];
  isOpen?: boolean;
  isFolder?: boolean;
}

export const useFileTree = (projectId: string) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedFile, setDraggedFile] = useState<FileNode | null>(null);

  // Fetch and build file tree
  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data } = await fileAPI.list(projectId);
      const fileList: FileNode[] = (data as any).files || [];
      const tree = buildFileTree(fileList);
      setFiles(tree);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Auto-fetch once whenever projectId changes
  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  // Create new file
  const createFile = useCallback(
    async (payload: CreateFileRequest) => {
      if (!projectId) return false;
      setLoading(true);
      try {
        await fileAPI.create(projectId, payload);
        await fetchFiles();
        return true;
      } catch (error) {
        console.error('Failed to create file:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [projectId, fetchFiles],
  );

  // Delete file
  const deleteFile = useCallback(
    async (fileId: string) => {
      if (!projectId) return false;
      setLoading(true);
      try {
        await fileAPI.delete(projectId, fileId);
        await fetchFiles();
        return true;
      } catch (error) {
        console.error('Failed to delete file:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [projectId, fetchFiles],
  );

  // Drag & drop handlers
  const handleDragStart = useCallback((file: FileNode) => {
    setDraggedFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (targetFile: FileNode) => {
      if (!draggedFile || !projectId) return;
      try {
        await fileAPI.move(projectId, draggedFile.id, targetFile.id);
        await fetchFiles();
      } catch (error) {
        console.error('Failed to move file:', error);
      }
      setDraggedFile(null);
    },
    [draggedFile, projectId, fetchFiles],
  );

  // Toggle folder open/close
  const toggleFolder = useCallback((fileId: string) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, isOpen: !file.isOpen } : file,
      ),
    );
  }, []);

  return {
    files,
    loading,
    draggedFile,
    fetchFiles,
    createFile,
    deleteFile,
    handleDragStart,
    handleDragOver,
    handleDrop,
    toggleFolder,
  };
};

// Build tree structure from flat file list
const buildFileTree = (files: ProjectFile[]): FileNode[] => {
  const fileMap = new Map<string, FileNode>();
  const roots: FileNode[] = [];

  // Initialize all files
  files.forEach((file) => {
    fileMap.set(file.id, {
      ...file,
      children: [],
      isOpen: false,
      isFolder: file.path?.includes('/') || file.name.endsWith('/'),
    });
  });

  // Build hierarchy
  fileMap.forEach((file) => {
    if (file.path) {
      const parentPath = file.path.split('/').slice(0, -1).join('/');
      const parentId = files.find(
        (f) => f.path === parentPath || f.name === parentPath,
      )?.id;

      if (parentId && fileMap.has(parentId)) {
        fileMap.get(parentId)!.children!.push(file);
      } else {
        roots.push(file);
      }
    } else {
      roots.push(file);
    }
  });

  return roots;
};
