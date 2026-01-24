// frontend/src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/useAuthContext';
import { roomAPI, projectAPI } from '../config/apiClient';
import {
  listInvitations,
  acceptInvitation,
  rejectInvitation,
} from '../services/inviteService';
import type {
  Room,
  CreateRoomRequest,
  ProjectSummary,
  InvitationDTO,
} from '../types/api';

const DashboardPage: React.FC = () => {
  const { user, token } = useAuthContext();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [invitations, setInvitations] = useState<InvitationDTO[]>([]);

  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch rooms the user owns.
  const fetchRooms = useCallback(async () => {
    if (!user || !token) return;
    setError('');
    try {
      const { data } = await roomAPI.list();
      setRooms(data.rooms || []);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch rooms:', err);
      setError(err.response?.data?.message || 'Failed to load rooms');
    }
  }, [user, token]);

  // Fetch projects shared with / owned by the user.
  const fetchProjects = useCallback(async () => {
    if (!user || !token) return;
    try {
      const { data } = await projectAPI.listForUser?.(); // implement this on backend
      setProjects(data.projects || []);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch projects:', err);
    }
  }, [user, token]);

  // Fetch pending invitations for the user.
  const fetchInvitations = useCallback(async () => {
    if (!user || !token) return;
    try {
      const data = await listInvitations();
      setInvitations(data || []);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch invitations:', err);
    }
  }, [user, token]);

  const fetchAll = useCallback(async () => {
    if (!user || !token) return;
    setRefreshing(true);
    await Promise.all([fetchRooms(), fetchProjects(), fetchInvitations()]);
    setRefreshing(false);
    setLoading(false);
  }, [user, token, fetchRooms, fetchProjects, fetchInvitations]);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    if (!user) return;
    void fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll, user]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setCreatingRoom(true);
    setError('');

    try {
      await roomAPI.create({
        name: newRoomName.trim(),
        description: newRoomDesc.trim() || undefined,
      } as CreateRoomRequest);

      setShowCreateRoom(false);
      setNewRoomName('');
      setNewRoomDesc('');
      await fetchRooms(); // refresh rooms only
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleRefresh = () => {
    void fetchAll();
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptInvitation(inviteId);
      await Promise.all([fetchInvitations(), fetchProjects()]);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to accept invitation:', err);
      setError(err.response?.data?.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    try {
      await rejectInvitation(inviteId);
      await fetchInvitations();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to reject invitation:', err);
      setError(err.response?.data?.message || 'Failed to reject invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Error Banner */}
      {error && (
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-red-500/50 bg-red-500/20 p-4 text-red-100 backdrop-blur-sm">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-4 text-red-200 hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-12">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-4xl font-bold text-transparent">
              Welcome back, {user?.displayName || 'User'}
            </h1>
            <p className="mt-2 text-xl text-gray-400">
              Manage rooms, shared projects, and invitations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 rounded-xl border border-gray-700 bg-gray-800 px-6 py-2 text-sm font-medium text-white transition-all duration-200 hover:border-gray-600 hover:bg-gray-700 disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="whitespace-nowrap rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-600 hover:to-purple-700 hover:shadow-2xl"
            >
              + New Room
            </button>
          </div>
        </div>

        {/* Create Room Modal */}
        {showCreateRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900/95 p-8 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-6 text-2xl font-bold text-white">
                Create New Room
              </h2>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Room Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full rounded-2xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-900/50"
                    placeholder="My Project Room"
                    required
                    disabled={creatingRoom}
                    autoFocus
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    className="w-full rounded-2xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-900/50"
                    placeholder="Collaborative coding workspace for team projects"
                    disabled={creatingRoom}
                    maxLength={200}
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={creatingRoom || !newRoomName.trim()}
                    className="flex flex-1 items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-semibold text-white shadow-xl transition-all duration-300 hover:from-blue-600 hover:to-purple-700 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingRoom ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      'Create Room'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateRoom(false);
                      setError('');
                      setNewRoomName('');
                      setNewRoomDesc('');
                    }}
                    disabled={creatingRoom}
                    className="rounded-2xl border border-gray-700 px-6 py-3 text-gray-400 transition-all duration-200 hover:border-gray-600 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="glass-card text-center transition-all duration-300 hover:border-blue-500/50">
            <div className="text-3xl font-bold text-blue-400">
              {rooms.length}
            </div>
            <div className="mt-1 font-medium text-gray-400">Rooms</div>
          </div>
          <div className="glass-card text-center transition-all duration-300 hover:border-purple-500/50">
            <div className="text-3xl font-bold text-purple-400">
              {projects.length}
            </div>
            <div className="mt-1 font-medium text-gray-400">
              Shared / Owned Projects
            </div>
          </div>
          <div className="glass-card text-center transition-all duration-300 hover:border-emerald-500/50">
            <div className="text-3xl font-bold text-emerald-400">
              {invitations.length}
            </div>
            <div className="mt-1 font-medium text-gray-400">
              Pending Invitations
            </div>
          </div>
        </div>

        {/* Invitations */}
        <div className="mb-12">
          <h2 className="mb-4 flex items-center justify-between text-2xl font-bold text-white">
            Invitations
            <span className="text-sm text-gray-500">
              {invitations.length === 0
                ? 'No pending invites'
                : `${invitations.length} pending`}
            </span>
          </h2>
          {invitations.length === 0 ? (
            <div className="glass-card py-6 text-center text-sm text-gray-500">
              You have no pending invitations right now.
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="glass-card flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {inv.projectName}
                    </p>
                    <p className="text-xs text-gray-400">
                      Invited by {inv.inviterName} • Role: {inv.role}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => void handleAcceptInvite(inv.id)}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => void handleRejectInvite(inv.id)}
                      className="rounded-xl border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-red-500 hover:text-red-300"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shared / Owned Projects */}
        <div className="mb-12">
          <h2 className="mb-6 flex items-center justify-between text-2xl font-bold text-white">
            Projects
            <span className="text-sm text-gray-500">
              Access projects you own or that are shared with you
            </span>
          </h2>
          {projects.length === 0 ? (
            <div className="glass-card py-10 text-center text-sm text-gray-500">
              No projects yet. Create a room and add a project, or accept an
              invitation to start collaborating.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/dashboard/project/${project.id}`}
                  className="group glass-card overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500/50 hover:bg-gray-900/70 hover:shadow-2xl"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 text-lg font-semibold text-white transition-colors group-hover:text-emerald-400">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <span className="ml-2 rounded-full border border-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                      {project.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Owner: {project.ownerName}{' '}
                    {project.isOwner && '• You'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Rooms Grid */}
        <div>
          <h2 className="mb-6 flex items-center justify-between text-2xl font-bold text-white">
            Your Rooms
            <span className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.length === 0 ? (
              <div className="glass-card col-span-full py-20 text-center">
                <svg
                  className="mx-auto mb-6 h-16 w-16 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mb-2 text-xl font-semibold text-gray-400">
                  No rooms yet
                </h3>
                <p className="mx-auto mb-8 max-w-md text-gray-500">
                  Get started by creating your first collaborative coding room.
                  Rooms contain projects with real-time Monaco Editor
                  collaboration.
                </p>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 font-semibold text-white shadow-xl transition-all duration-300 hover:from-blue-600 hover:to-purple-700 hover:shadow-2xl"
                >
                  Create First Room
                </button>
              </div>
            ) : (
              rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/dashboard/room/${room.id}`}
                  className="group glass-card overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-blue-500/50 hover:bg-gray-900/70 hover:shadow-2xl"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg transition-transform duration-300 group-hover:scale-110">
                        <svg
                          className="h-6 w-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="line-clamp-1 text-xl font-bold text-white transition-colors group-hover:text-blue-400">
                          {room.name}
                        </h3>
                        {room.description && (
                          <p className="mt-1 line-clamp-1 text-gray-400">
                            {room.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {room.isTrusted && (
                      <div className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                        Trusted
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 transition-colors group-hover:text-gray-400">
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Created by you • Ready to collaborate
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
