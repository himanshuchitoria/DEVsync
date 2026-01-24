// frontend/src/pages/ProjectPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuthContext } from '../context/useAuthContext';
import { useFileTree, type FileNode } from '../hooks/useFileTree';
import { useMobileTree } from '../hooks/useMobileTree';
import { useCollab } from '../hooks/useCollab';
import FileTree from '../components/FileTree';
import PresenceBar from '../components/PresenceBar';
import MobileNavbar from '../components/MobileNavbar';
import { projectAPI, fileAPI } from '../config/apiClient';
import { monacoOptions, getLanguageFromFile } from '../utils/monaco';
import type { Project } from '../types/api';
import {
  inviteCollaborator,
  fetchCollaborators,
  changeCollaboratorRole,
  type CollaboratorRole,
  type CollaboratorDTO,
} from '../services/inviteService';

const ProjectPage: React.FC = () => {
  const { user } = useAuthContext();
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

  if (!projectId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-8">
        <p className="text-sm text-gray-400">Missing project id.</p>
      </div>
    );
  }

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Editor state
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] =
    useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSavingHttp, setIsSavingHttp] = useState(false);
  const editorRef =
    useRef<
      Parameters<
        NonNullable<React.ComponentProps<typeof Editor>['onMount']>
      >[0] | null
    >(null);

  // File tree hooks (internally auto-fetches on projectId change)
  const fileTree = useFileTree(projectId);
  const mobileTree = useMobileTree({ projectId });

  // Collaboration hook (project + file presence)
  const collab = useCollab(projectId, editorRef);

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteEmailOrId, setInviteEmailOrId] = useState('');
  const [inviteRole, setInviteRole] =
    useState<CollaboratorRole>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] =
    useState<string | null>(null);

  // Roles panel state
  const [showRoles, setShowRoles] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorDTO[]>(
    [],
  );
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState<string | null>(null);

  // Invite link
  const inviteLink = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/dashboard/project/${projectId}${
      location.search || ''
    }`;
  }, [projectId, location.search]);

  const isOwner = useMemo(
    () => !!project && !!user && project.ownerId === user.id,
    [project, user],
  );

  const activeFileId = useMemo(
    () =>
      activeFile?.id ||
      mobileTree.activeFileId ||
      fileTree.files[0]?.id ||
      '',
    [activeFile?.id, mobileTree.activeFileId, fileTree.files],
  );

  // Fetch project metadata
  useEffect(() => {
    if (!user) return;

    const fetchProject = async () => {
      setLoading(true);
      setProjectError(null);
      try {
        const { data } = await projectAPI.get(projectId);
        setProject(data.project);
      } catch (error: any) {
        console.error('Failed to fetch project:', error);
        if (error.response?.status === 403) {
          setProjectError('You do not have access to this project.');
        } else if (error.response?.status === 404) {
          setProjectError('Project not found.');
        } else {
          setProjectError('Failed to load project.');
        }
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchProject();
  }, [projectId, user]);

  // Auto-select first file when file tree loads
  useEffect(() => {
    if (!activeFile && fileTree.files.length > 0) {
      const first = fileTree.files[0];
      setActiveFile(first);
      mobileTree.setActiveFileId?.(first.id);
    }
  }, [fileTree.files, activeFile, mobileTree]);

  // Load file content via REST API
  const loadFileContent = useCallback(
    async (fileId: string) => {
      if (!fileId) return;
      try {
        const { data } = await fileAPI.get(projectId, fileId);
        const content = data.file?.content ?? data.content ?? '';
        setEditorValue(content);
        setSaveStatus('idle');
      } catch (error) {
        console.error('Failed to load file:', error);
        setEditorValue('');
        setSaveStatus('error');
      }
    },
    [projectId],
  );

  // Handle active file change: load content + join collab room
  useEffect(() => {
    if (!activeFile) return;
    void loadFileContent(activeFile.id);
    collab.setActiveFile(activeFile.id);
  }, [activeFile, loadFileContent, collab]);

  // Editor event handlers
  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);

  const handleEditorChange = useCallback(
    (value?: string) => {
      const val = value ?? '';
      setEditorValue(val);
      if (!activeFile) return;
      setPendingContent(val);
      setSaveStatus('saving');
      // OT edits are emitted from useCollab's internal listeners.
    },
    [activeFile],
  );

  // Autosave effect – guard against overlapping saves
  useEffect(() => {
    if (!activeFile || pendingContent === null) return;
    if (isSavingHttp) return;

    const timeout = setTimeout(async () => {
      setIsSavingHttp(true);
      try {
        await fileAPI.update(projectId, activeFile.id, pendingContent);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to autosave file:', err);
        setSaveStatus('error');
      } finally {
        setPendingContent(null);
        setIsSavingHttp(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [pendingContent, activeFile, projectId, isSavingHttp]);

  // File selection handler
  const handleFileSelect = useCallback(
    (file: FileNode) => {
      if (file.isFolder) return;
      setActiveFile(file);
      mobileTree.setActiveFileId?.(file.id);
    },
    [mobileTree],
  );

  // Roles panel handlers
  const openRolesPanel = useCallback(async () => {
    setShowRoles(true);
    setRolesLoading(true);
    try {
      const data = await fetchCollaborators(projectId);
      setCollaborators(data);
    } catch (err) {
      console.error('Failed to fetch collaborators:', err);
    } finally {
      setRolesLoading(false);
    }
  }, [projectId]);

  const handleRoleChange = useCallback(
    async (userId: string, role: CollaboratorRole) => {
      setRoleSaving(userId);
      try {
        await changeCollaboratorRole(projectId, userId, role);
        setCollaborators((prev) =>
          prev.map((c) => (c.id === userId ? { ...c, role } : c)),
        );
      } catch (err) {
        console.error('Failed to update role:', err);
      } finally {
        setRoleSaving(null);
      }
    },
    [projectId],
  );

  // Invite handlers
  const handleInviteSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteEmailOrId.trim()) return;
      setInviteError(null);
      setInviteSuccess(null);
      setInviteLoading(true);
      try {
        await inviteCollaborator(
          projectId,
          inviteEmailOrId.trim(),
          inviteRole,
        );
        setInviteSuccess('Invite sent / role updated');
        setInviteEmailOrId('');
      } catch (err: any) {
        console.error('Failed to invite collaborator:', err);
        setInviteError(
          err?.response?.data?.message ||
            'Failed to invite collaborator. Make sure this user exists and you are the owner.',
        );
      } finally {
        setInviteLoading(false);
      }
    },
    [projectId, inviteEmailOrId, inviteRole],
  );

  const handleCopyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  }, [inviteLink]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Error state
  if (!project || projectError) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="py-20 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-400">
            {projectError || 'Project not found'}
          </h1>
          <p className="mb-4 text-sm text-gray-500">
            {projectError
              ? 'Make sure you are logged in with the invited account.'
              : 'The project may have been deleted or never existed.'}
          </p>
          <Link
            to="/dashboard"
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-900 lg:flex-row">
      {/* Mobile overlay */}
      {mobileTree.isOpen && (
        <div
          className="mobile-tree-overlay fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={mobileTree.close}
        />
      )}

      {/* File Tree */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-800 bg-gray-900/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:block lg:w-80 ${
          mobileTree.isOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <FileTree
          projectId={projectId}
          onFileSelect={handleFileSelect}
          activeFileId={activeFileId}
        />
      </div>

      {/* Editor Area */}
      <div className="relative flex flex-1 flex-col">
        {/* Editor Header - Desktop */}
        <div className="hidden h-12 items-center justify-between border-b border-gray-800 bg-gray-900/50 px-6 lg:flex">
          <div className="flex items-center space-x-4 truncate">
            <span className="rounded-xl bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400">
              {activeFile?.name || 'No file selected'}
            </span>
            {user && (
              <div className="flex items-center space-x-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span>{user.displayName}</span>
                {collab.isConnected && (
                  <span className="ml-2 rounded-full border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                    Live
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-xs text-gray-500">
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && 'All changes saved'}
              {saveStatus === 'error' && 'Error saving'}
            </div>

            {user && (
              <>
                <button
                  onClick={() => setShowInvite(true)}
                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500"
                >
                  Invite
                </button>
                {isOwner && (
                  <button
                    onClick={openRolesPanel}
                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500"
                  >
                    Manage roles
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Monaco Editor + Presence */}
        <div className="relative flex-1">
          {activeFile ? (
            <Editor
              height="100%"
              language={getLanguageFromFile(activeFile.name || '')}
              value={editorValue}
              onMount={handleEditorMount}
              onChange={handleEditorChange}
              theme="codecollabDark"
              options={monacoOptions}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              No file selected
            </div>
          )}

          <PresenceBar
            projectId={projectId}
            users={collab.users}
            fileUsers={collab.fileUsers}
            isConnected={collab.isConnected}
          />
        </div>
      </div>

      {/* Mobile Navbar */}
      <MobileNavbar
        files={fileTree.files}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onToggleFileTree={mobileTree.toggle}
      />

      {/* Invite Modal */}
      {/* ... unchanged modal + roles panel code ... */}
      {/* (Keep your existing invite and roles JSX here; logic above is already wired.) */}
    </div>
  );
};

export default ProjectPage;
