// frontend/src/types/api.ts

// ---------- Users & Auth ----------

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ---------- Rooms ----------

export type RoomRole = 'owner' | 'maintainer' | 'editor' | 'viewer' | 'guest';

export interface RoomMember {
  user: string; // User ID
  role: RoomRole;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  isTrusted: boolean;
  createdBy: string; // User ID
}

export interface RoomListResponse {
  rooms: Room[];
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
}

// ---------- Projects & Files ----------

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content?: string;
}

// Full project (used by GET /projects/:id)
export interface Project {
  id: string;
  name: string;
  roomId: string;
  ownerId: string;
  files: ProjectFile[];
}

// Lightweight project used in list view (GET /projects/room/:roomId)
export interface ProjectListItem {
  id: string;
  name: string;
  roomId: string;
  ownerId?: string;
  fileCount: number;
  createdAt?: string;
}

// Role of the current user on a project shared with them.
export type ProjectCollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  role: ProjectCollaboratorRole; // current user’s role on this project
}

export interface ProjectResponse {
  project: Project;
}

// For GET /projects/room/:roomId
export interface ProjectListResponse {
  projects: ProjectListItem[];
}

// Shared projects for current user (e.g. GET /projects/me/shared)
export interface SharedProjectsResponse {
  projects: ProjectSummary[];
}

export interface CreateProjectRequest {
  name: string;
}

// ---------- Files ----------

export interface CreateFileRequest {
  name: string;
  path: string;
  language: string;
  content?: string;
}

// ---------- Invitations & Collaboration ----------

// Invitation sent to or received by the current user
export interface InvitationDTO {
  id: string;
  projectId: string;
  projectName: string;
  roomId: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeEmail: string;
  role: ProjectCollaboratorRole;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  createdAt: string;
}

// List of invitations for current user (e.g. GET /projects/me/invitations)
export interface InvitationListResponse {
  invitations: InvitationDTO[];
}

// Socket.IO payloads (matching backend handlers)
export interface CollabJoinPayload {
  projectId: string;
  fileId: string;
}

export interface CollabEditPayload {
  projectId: string;
  fileId: string;
  version: number;
  payload: unknown; // OT/CRDT operation
}

export interface CollabJoinedResponse {
  projectId: string;
  fileId: string;
  content: string;
}

export interface PresencePayload {
  roomId: string;
}
