// frontend/src/config/apiClient.ts
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type {
  AuthResponse,
  RoomListResponse,
  ProjectResponse,
  CreateRoomRequest,
  CreateProjectRequest,
  CreateFileRequest,
  SharedProjectsResponse,
  InvitationListResponse,
} from '../types/api';

// Prefer explicit API URL; fall back to relative /api for local dev.
const API_BASE =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim().length > 0
    ? import.meta.env.VITE_API_URL
    : '/api';

// Single axios instance for the whole app
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  responseType: 'json',
});

// Request interceptor - attach auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    const base = config.baseURL ?? '';
    const url = config.url ?? '';
    console.debug('[API] ➜', config.method?.toUpperCase(), base + url);
  }

  return config;
});

// Response interceptor - handle 401 + log timeouts
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      const cfg = error.config;
      const base = cfg?.baseURL ?? '';
      const url = cfg?.url ?? '';
      console.error('[API] ❌ Request timeout:', {
        url: base + url,
        timeout: cfg?.timeout,
      });
    }

    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    return Promise.reject(error);
  },
);

// ---------- Auth API ----------
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),
  register: (email: string, password: string, displayName: string) =>
    apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      displayName,
    }),
};

// ---------- Room API ----------
export const roomAPI = {
  list: () => apiClient.get<RoomListResponse>('/rooms'),
  create: (data: CreateRoomRequest) =>
    apiClient.post<RoomListResponse>('/rooms', data),
  get: (id: string) => apiClient.get(`/rooms/${id}`),
};

// ---------- Project API ----------
export const projectAPI = {
  list: (roomId: string) => apiClient.get(`/projects/room/${roomId}`),
  create: (roomId: string, data: CreateProjectRequest) =>
    apiClient.post('/projects', { roomId, name: data.name }),
  get: (id: string) => apiClient.get<ProjectResponse>(`/projects/${id}`),
  listForUser: () =>
    apiClient.get<SharedProjectsResponse>('/projects/me/shared'),

  invite: (
    projectId: string,
    emailOrUserId: string,
    role: 'owner' | 'editor' | 'viewer' = 'editor',
  ) =>
    apiClient.post(`/projects/${projectId}/invite`, {
      emailOrUserId,
      role,
    }),

  getCollaborators: (projectId: string) =>
    apiClient.get(`/projects/${projectId}/collaborators`),

  updateCollaboratorRole: (
    projectId: string,
    userId: string,
    role: 'owner' | 'editor' | 'viewer',
  ) =>
    apiClient.patch(`/projects/${projectId}/collaborators/${userId}`, {
      role,
    }),

  removeCollaborator: (projectId: string, userId: string) =>
    apiClient.delete(`/projects/${projectId}/collaborators/${userId}`),

  listInvitations: () =>
    apiClient.get<InvitationListResponse>('/projects/me/invitations'),

  acceptInvitation: (invitationId: string) =>
    apiClient.post(
      `/projects/invitations/${invitationId}/accept`,
      undefined,
    ),

  rejectInvitation: (invitationId: string) =>
    apiClient.post(
      `/projects/invitations/${invitationId}/reject`,
      undefined,
    ),
};

// ---------- File API ----------
export const fileAPI = {
  list: (projectId: string) =>
    apiClient.get(`/projects/${projectId}/files`),

  create: (projectId: string, data: CreateFileRequest) =>
    apiClient.post(`/projects/${projectId}/files`, data),

  get: (projectId: string, fileId: string) =>
    apiClient.get(`/projects/${projectId}/files/${fileId}`),

  update: (projectId: string, fileId: string, content: string) =>
    apiClient.put(`/projects/${projectId}/files/${fileId}`, { content }),

  delete: (projectId: string, fileId: string) =>
    apiClient.delete(`/projects/${projectId}/files/${fileId}`),

  move: (projectId: string, fileId: string, parentId: string) =>
    apiClient.patch(`/projects/${projectId}/files/${fileId}/move`, {
      parentId,
    }),
};

export default apiClient;
