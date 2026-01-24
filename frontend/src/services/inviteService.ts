// frontend/src/services/inviteService.ts
import { projectAPI } from '../config/apiClient';
import type {
  ProjectCollaboratorRole,
  InvitationDTO,
} from '../types/api';

/**
 * Roles that a collaborator can have on a project.
 * Re-exported for convenience in UI components.
 */
export type CollaboratorRole = ProjectCollaboratorRole;

export interface CollaboratorDTO {
  id: string;
  email: string;
  displayName: string;
  role: CollaboratorRole;
}

/**
 * Send an invite to a collaborator.
 * Backend: POST /api/projects/:projectId/invite
 */
export const inviteCollaborator = async (
  projectId: string,
  emailOrUserId: string,
  role: CollaboratorRole = 'editor',
): Promise<void> => {
  await projectAPI.invite(projectId, emailOrUserId, role);
};

/**
 * Fetch the list of collaborators for a project.
 * Backend: GET /api/projects/:projectId/collaborators
 */
export const fetchCollaborators = async (
  projectId: string,
): Promise<CollaboratorDTO[]> => {
  const { data } = await projectAPI.getCollaborators(projectId);
  return (data.collaborators || []) as CollaboratorDTO[];
};

/**
 * Update a collaborator's role (owner-only operation).
 * Backend: PATCH /api/projects/:projectId/collaborators/:userId
 */
export const changeCollaboratorRole = async (
  projectId: string,
  userId: string,
  role: CollaboratorRole,
): Promise<void> => {
  await projectAPI.updateCollaboratorRole(projectId, userId, role);
};

/**
 * Revoke a collaborator's access to a project completely.
 * Backend: DELETE /api/projects/:projectId/collaborators/:userId
 */
export const revokeCollaboratorAccess = async (
  projectId: string,
  userId: string,
): Promise<void> => {
  await projectAPI.removeCollaborator(projectId, userId);
};

/**
 * List invitations for the current user.
 * Backend: GET /api/projects/me/invitations
 */
export const listInvitations = async (): Promise<InvitationDTO[]> => {
  const { data } = await projectAPI.listInvitations();
  return data.invitations || [];
};

/**
 * Accept an invitation (current user joins project with given role).
 * Backend: POST /api/projects/invitations/:invitationId/accept
 */
export const acceptInvitation = async (
  invitationId: string,
): Promise<void> => {
  await projectAPI.acceptInvitation(invitationId);
};

/**
 * Reject an invitation (current user declines).
 * Backend: POST /api/projects/invitations/:invitationId/reject
 */
export const rejectInvitation = async (
  invitationId: string,
): Promise<void> => {
  await projectAPI.rejectInvitation(invitationId);
};
