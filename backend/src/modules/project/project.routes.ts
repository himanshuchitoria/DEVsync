// src/modules/project/project.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import {
  createProject,
  addFileToProject,
  getProject,
  listProjectsInRoom,
  listFilesInProject,
  getFileInProject,
  updateFileInProject,
  inviteCollaborator,
  listCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
  listSharedProjectsForUser,
  listInvitationsForUser,
  acceptInvitation,
  rejectInvitation,
} from './project.controller';

export const projectRouter = Router();

// All project routes require authentication.
projectRouter.use(authMiddleware);

/**
 * Project creation & room listing
 */

// Create a new project in a room.
projectRouter.post('/', createProject);

// List all projects in a room (for RoomPage).
// IMPORTANT: this must come BEFORE '/:projectId'.
projectRouter.get('/room/:id', listProjectsInRoom);

/**
 * Shared projects & invitations for current user
 */

// List projects where the current user is a collaborator (shared with me).
projectRouter.get('/me/shared', listSharedProjectsForUser);

// List invitations for the current user.
projectRouter.get('/me/invitations', listInvitationsForUser);

// Accept an invitation.
projectRouter.post('/invitations/:invitationId/accept', acceptInvitation);

// Reject an invitation.
projectRouter.post('/invitations/:invitationId/reject', rejectInvitation);

/**
 * Files within a project
 */

// List all files in a project (for FileTree / ProjectPage).
projectRouter.get('/:projectId/files', listFilesInProject);

// Get a single file in a project.
projectRouter.get('/:projectId/files/:fileId', getFileInProject);

// Update a single file in a project.
projectRouter.put('/:projectId/files/:fileId', updateFileInProject);

// Add a file to an existing project.
projectRouter.post('/:projectId/files', addFileToProject);

/**
 * Collaboration: invite + roles + revoke
 */

// Invite a collaborator (owner only).
projectRouter.post('/:projectId/invite', inviteCollaborator);

// List collaborators for a project.
projectRouter.get('/:projectId/collaborators', listCollaborators);

// Update collaborator role (owner only).
projectRouter.patch('/:projectId/collaborators/:userId', updateCollaboratorRole);

// Remove collaborator access entirely (owner only).
projectRouter.delete('/:projectId/collaborators/:userId', removeCollaborator);

/**
 * Get a project with its file list (metadata + content).
 */
projectRouter.get('/:projectId', getProject);
