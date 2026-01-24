// src/pages/RoomPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/useAuthContext';
import { roomAPI, projectAPI } from '../config/apiClient';
import type {
  Room,
  ProjectListItem,
  CreateProjectRequest,
  ProjectListResponse,
} from '../types/api';

const RoomPage: React.FC = () => {
  const { user } = useAuthContext();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [error, setError] = useState('');
  const [noAccess, setNoAccess] = useState(false);

  const fetchRoomData = useCallback(async () => {
    if (!roomId || !user) return;
    
    setLoading(true);
    setError('');
    setNoAccess(false);

    try {
      const [{ data: roomData }, { data: projectData }] = await Promise.all([
        roomAPI.get(roomId),
        projectAPI.list(roomId),
      ]);

      setRoom(roomData.room);
      const list = (projectData as ProjectListResponse).projects || [];
      setProjects(list);
    } catch (err: any) {
      console.error('Failed to fetch room data:', err);
      
      if (err.response?.status === 403) {
        setNoAccess(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load room data');
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, user]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !newProjectName.trim()) return;

    setCreatingProject(true);
    setError('');

    try {
      await projectAPI.create(roomId, { name: newProjectName } as CreateProjectRequest);
      setShowCreateProject(false);
      setNewProjectName('');
      await fetchRoomData(); // refresh room + projects
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/dashboard/project/${projectId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (noAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-3xl flex items-center justify-center">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">No Access</h2>
          <p className="text-gray-400 mb-8">
            You don't have permission to view this room. Check with the room owner or accept any pending invitations.
          </p>
          <Link
            to="/dashboard"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 inline-block"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Room Not Found</h2>
          <Link
            to="/dashboard"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 inline-block"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-2xl backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Room Header */}
      <div className="mb-12">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {room.name}
                </h1>
                {room.description && (
                  <p className="text-xl text-gray-400 mt-2">{room.description}</p>
                )}
              </div>
            </div>
            {room.isTrusted && (
              <div className="inline-flex items-center px-4 py-2 bg-green-500/20 text-green-400 text-sm rounded-2xl border border-green-500/30 font-medium">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Trusted Room
              </div>
            )}
          </div>
          <button
            onClick={() => setShowCreateProject(true)}
            disabled={creatingProject}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {creatingProject ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating...</span>
              </span>
            ) : (
              '+ New Project'
            )}
          </button>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/95 border border-gray-800 rounded-3xl p-8 max-w-md w-full backdrop-blur-xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 disabled:bg-gray-900/50"
                  placeholder="My Next.js App"
                  required
                  disabled={creatingProject}
                  autoFocus
                  maxLength={50}
                />
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={creatingProject || !newProjectName.trim()}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingProject ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </span>
                  ) : (
                    'Create Project'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProject(false);
                    setError('');
                    setNewProjectName('');
                  }}
                  disabled={creatingProject}
                  className="px-6 py-3 text-gray-400 hover:text-white border border-gray-700 rounded-2xl hover:border-gray-600 transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">
            Projects ({projects.length})
          </h2>
          <Link
            to="/dashboard"
            className="text-gray-400 hover:text-white text-sm font-medium flex items-center hover:underline transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-700 rounded-3xl p-12">
            <svg className="mx-auto h-16 w-16 text-gray-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Create your first project to start collaborative coding. Projects contain files and enable real-time collaboration.
            </p>
            <button
              onClick={() => setShowCreateProject(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group bg-gray-900/50 backdrop-blur-xl border border-gray-800 hover:border-emerald-500/50 rounded-3xl p-8 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden hover:bg-gray-900/70 cursor-pointer"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {project.fileCount ?? 0} files
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                  <span className="text-xs text-gray-500 group-hover:text-emerald-400 transition-colors">
                    Ready to collaborate
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full group-hover:animate-pulse" />
                    <svg className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
