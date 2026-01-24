// src/modules/project/project.controller.ts
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middlewares/authMiddleware';
import mongoose from 'mongoose';
import {
  Project,
  type ProjectRole,
  type ProjectDocument,
  type ProjectInvitationStatus,
} from './project.model';
import { Room } from '../room/room.model';
import { User } from '../user/user.model';

const toObjectId = (id: string): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(id);

// ---------- Helpers ----------

const ensureAuth = (req: AuthenticatedRequest, res: Response): string | null => {
  if (!req.user?.sub) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }
  return req.user.sub;
};

const ensureValidObjectId = (
  id: string,
  res: Response,
  name: string,
): boolean => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: `Invalid ${name} format` });
    return false;
  }
  return true;
};

const hasProjectAccess = (project: ProjectDocument | any, userId: string): boolean => {
  const ownerId = project.owner ? project.owner.toString() : '';
  const isOwner = ownerId !== '' && ownerId === userId;
  const isCollaborator = (project.collaborators || []).some(
    (c: any) => c.user && c.user.toString() === userId,
  );
  return isOwner || isCollaborator;
};

// ---------- Project creation & files ----------

export const createProject = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { roomId, name } = req.body as { roomId?: string; name?: string };

  if (!roomId || !name) {
    return res
      .status(400)
      .json({ message: 'roomId and name are required' });
  }

  if (!ensureValidObjectId(roomId, res, 'roomId')) return res;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const ownerId = toObjectId(userId);

  const project = await Project.create({
    room: room._id,
    name,
    owner: ownerId,
    collaborators: [
      {
        user: ownerId,
        role: 'owner',
        invitedBy: ownerId,
      },
    ],
    files: [],
    invitations: [],
  });

  return res.status(201).json({
    project: {
      id: project._id.toString(),
      name: project.name,
      roomId: project.room.toString(),
      ownerId: project.owner.toString(),
      files: project.files || [],
    },
  });
};

export const addFileToProject = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId } = req.params as { projectId: string };
  const { name, path, language, content } = req.body as {
    name?: string;
    path?: string;
    language?: string;
    content?: string;
  };

  if (!name || !path || !language) {
    return res
      .status(400)
      .json({ message: 'name, path and language are required' });
  }

  if (!ensureValidObjectId(projectId, res, 'projectId')) return res;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!hasProjectAccess(project, userId)) {
    return res
      .status(403)
      .json({ message: 'You do not have access to this project' });
  }

  project.files.push({
    name,
    path,
    language,
    content: content ?? '',
  } as any);

  await project.save();

  const file = project.files[project.files.length - 1];

  return res.status(201).json({
    file: {
      id: (file._id as mongoose.Types.ObjectId).toString(),
      name: file.name,
      path: file.path,
      language: file.language,
    },
  });
};

export const listFilesInProject = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId } = req.params as { projectId: string };

  if (!ensureValidObjectId(projectId, res, 'projectId')) return res;

  const project = await Project.findById(projectId).lean();
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!hasProjectAccess(project, userId)) {
    return res
      .status(403)
      .json({ message: 'You do not have access to this project' });
  }

  return res.status(200).json({
    files: (project.files || []).map((file: any) => ({
      id: file._id.toString(),
      name: file.name,
      path: file.path,
      language: file.language,
      content: file.content,
    })),
  });
};

export const getFileInProject = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId, fileId } = req.params as {
    projectId: string;
    fileId: string;
  };

  if (
    !ensureValidObjectId(projectId, res, 'projectId') ||
    !ensureValidObjectId(fileId, res, 'fileId')
  ) {
    return res;
  }

  const project = await Project.findById(projectId).lean();
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!hasProjectAccess(project, userId)) {
    return res
      .status(403)
      .json({ message: 'You do not have access to this project' });
  }

  const file: any = (project.files || []).find(
    (f: any) => f._id.toString() === fileId,
  );

  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }

  return res.status(200).json({
    file: {
      id: file._id.toString(),
      name: file.name,
      path: file.path,
      language: file.language,
      content: file.content ?? '',
    },
  });
};

export const updateFileInProject = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId, fileId } = req.params as {
    projectId: string;
    fileId: string;
  };
  const { content } = req.body as { content?: string };

  if (
    !ensureValidObjectId(projectId, res, 'projectId') ||
    !ensureValidObjectId(fileId, res, 'fileId')
  ) {
    return res;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!hasProjectAccess(project, userId)) {
    return res
      .status(403)
      .json({ message: 'You do not have access to this project' });
  }

  const file: any = project.files.id(fileId);
  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }

  file.content = content ?? '';
  await project.save();

  return res.status(200).json({
    file: {
      id: file._id.toString(),
      name: file.name,
      path: file.path,
      language: file.language,
      content: file.content,
    },
  });
};

// ---------- Project fetch / list ----------

export const getProject = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId } = req.params as { projectId: string };

  if (!ensureValidObjectId(projectId, res, 'projectId')) return res;

  const project = await Project.findById(projectId).lean();
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!hasProjectAccess(project, userId)) {
    return res
      .status(403)
      .json({ message: 'You do not have access to this project' });
  }

  const ownerId = project.owner ? project.owner.toString() : '';
  const roomId = project.room ? project.room.toString() : '';

  return res.status(200).json({
    project: {
      id: project._id!.toString(),
      name: project.name,
      roomId,
      ownerId,
      files: (project.files || []).map((file: any) => ({
        id: file._id!.toString(),
        name: file.name,
        path: file.path,
        language: file.language,
        content: file.content || '',
      })),
    },
  });
};

export const listProjectsInRoom = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { id: roomId } = req.params as { id: string };

  if (!ensureValidObjectId(roomId, res, 'roomId')) return res;

  const room = await Room.findById(roomId).lean();
  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const projects = await Project.find({ room: roomId }).lean();

  return res.status(200).json({
    projects: projects.map((project) => ({
      id: project._id?.toString() ?? '',
      name: project.name,
      roomId: project.room ? project.room.toString() : roomId,
      ownerId: project.owner ? project.owner.toString() : '',
      fileCount: Array.isArray(project.files) ? project.files.length : 0,
      createdAt: project.createdAt,
    })),
  });
};

// List projects shared with the current user (only accepted collaborators)
export const listSharedProjectsForUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const userObjectId = toObjectId(userId);

  const projects = await Project.find({
    'collaborators.user': userObjectId,
  })
    .populate('owner', 'displayName')
    .lean();

  const items = (projects || []).map((project: any) => {
    const collab = (project.collaborators || []).find(
      (c: any) => c.user?.toString() === userId,
    );
    return {
      id: project._id.toString(),
      name: project.name,
      description: '',
      ownerId: project.owner?.toString() ?? '',
      ownerName: project.owner?.displayName ?? 'Owner',
      role: (collab?.role ?? 'viewer') as ProjectRole,
    };
  });

  return res.status(200).json({ projects: items });
};

// ---------- Invitations & collaborators ----------

export const inviteCollaborator = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId } = req.params as { projectId: string };
  const { emailOrUserId, role } = req.body as {
    emailOrUserId?: string;
    role?: ProjectRole;
  };

  if (!emailOrUserId || !role) {
    return res
      .status(400)
      .json({ message: 'emailOrUserId and role are required' });
  }

  if (!['editor', 'viewer', 'owner'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  if (!ensureValidObjectId(projectId, res, 'projectId')) return res;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!project.owner) {
    return res.status(400).json({ message: 'Project has no owner set' });
  }

  // Only owner can invite
  if (project.owner.toString() !== userId) {
    return res
      .status(403)
      .json({ message: 'Only owner can invite collaborators' });
  }

  // Resolve user by id or email
  let targetUser: any = null;
  if (mongoose.Types.ObjectId.isValid(emailOrUserId)) {
    targetUser = await User.findById(emailOrUserId).lean();
  }
  if (!targetUser) {
    targetUser = await User.findOne({ email: emailOrUserId }).lean();
  }
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const targetId = targetUser._id as mongoose.Types.ObjectId;

  // Check for existing pending invitation
  const existingInvitation = (project.invitations || []).find(
    (inv: any) =>
      inv.invitee?.toString() === targetId.toString() &&
      inv.status === 'pending',
  );

  if (existingInvitation) {
    // Update existing pending invitation
    existingInvitation.role = role;
    existingInvitation.updatedAt = new Date();
  } else {
    // Create new pending invitation (DO NOT add to collaborators yet)
    project.invitations.push({
      project: project._id,
      room: project.room,
      inviter: toObjectId(userId),
      invitee: targetId,
      inviteeEmail: targetUser.email,
      role,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  }

  await project.save();

  return res.status(200).json({
    message: 'Invitation sent',
  });
};

export const listCollaborators = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId } = req.params as { projectId: string };

  if (!ensureValidObjectId(projectId, res, 'projectId')) return res;

  const project = await Project.findById(projectId)
    .populate('collaborators.user', 'email displayName')
    .lean();

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!hasProjectAccess(project, userId)) {
    return res
      .status(403)
      .json({ message: 'You do not have access to this project' });
  }

  const collaborators = (project.collaborators || []).map((c: any) => ({
    id: c.user._id.toString(),
    email: c.user.email,
    displayName: c.user.displayName,
    role: c.role as ProjectRole,
  }));

  return res.status(200).json({ collaborators });
};

export const updateCollaboratorRole = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId, userId: targetUserId } = req.params as {
    projectId: string;
    userId: string;
  };
  const { role } = req.body as { role?: ProjectRole };

  if (!role || !['owner', 'editor', 'viewer'].includes(role)) {
    return res.status(400).json({ message: 'Valid role is required' });
  }

  if (
    !ensureValidObjectId(projectId, res, 'projectId') ||
    !ensureValidObjectId(targetUserId, res, 'userId')
  ) {
    return res;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!project.owner) {
    return res.status(400).json({ message: 'Project has no owner set' });
  }

  // Only owner can change roles
  if (project.owner.toString() !== userId) {
    return res
      .status(403)
      .json({ message: 'Only owner can change roles' });
  }

  const collab = project.collaborators.find(
    (c) => c.user.toString() === targetUserId,
  );
  if (!collab) {
    return res.status(404).json({ message: 'Collaborator not found' });
  }

  collab.role = role;
  await project.save();

  return res.status(200).json({ message: 'Role updated' });
};

// Remove collaborator access entirely
export const removeCollaborator = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { projectId, userId: targetUserId } = req.params as {
    projectId: string;
    userId: string;
  };

  if (
    !ensureValidObjectId(projectId, res, 'projectId') ||
    !ensureValidObjectId(targetUserId, res, 'userId')
  ) {
    return res;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (project.owner.toString() !== userId) {
    return res
      .status(403)
      .json({ message: 'Only owner can revoke access' });
  }

  project.collaborators = project.collaborators.filter(
    (c) => c.user.toString() !== targetUserId,
  );
  await project.save();

  return res.status(200).json({ message: 'Collaborator removed' });
};

// ---------- Invitations for current user ----------

export const listInvitationsForUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const userObjectId = toObjectId(userId);

  const projects = await Project.find({
    'invitations.invitee': userObjectId,
    'invitations.status': 'pending',
  })
    .populate('owner', 'displayName')
    .lean();

  const invitations: any[] = [];

  projects.forEach((project: any) => {
    (project.invitations || []).forEach((inv: any) => {
      if (
        inv.invitee?.toString() === userId &&
        inv.status === 'pending'
      ) {
        invitations.push({
          id: inv._id.toString(),
          projectId: project._id.toString(),
          projectName: project.name,
          roomId: project.room?.toString() ?? '',
          inviterId: inv.inviter?.toString() ?? '',
          inviterName: inv.inviterName ?? project.owner?.displayName ?? 'Owner',
          inviteeId: userId,
          inviteeEmail: inv.inviteeEmail ?? '',
          role: inv.role as ProjectRole,
          status: inv.status as ProjectInvitationStatus,
          createdAt: inv.createdAt,
        });
      }
    });
  });

  return res.status(200).json({ invitations });
};

const updateInvitationStatus = async (
  userId: string,
  invitationId: string,
  nextStatus: ProjectInvitationStatus,
): Promise<{ ok: boolean; message: string }> => {
  const project = await Project.findOne({
    'invitations._id': invitationId,
  });
  if (!project) {
    return { ok: false, message: 'Invitation not found' };
  }

  const invitation: any = project.invitations.id(invitationId);
  if (!invitation) {
    return { ok: false, message: 'Invitation not found' };
  }

  if (invitation.invitee.toString() !== userId) {
    return { ok: false, message: 'Not your invitation' };
  }

  if (invitation.status !== 'pending') {
    return { ok: false, message: 'Invitation already processed' };
  }

  invitation.status = nextStatus;
  invitation.updatedAt = new Date();

  if (nextStatus === 'accepted') {
    const already = project.collaborators.find(
      (c) => c.user.toString() === userId,
    );
    if (!already) {
      project.collaborators.push({
        user: invitation.invitee,
        role: invitation.role,
        invitedBy: invitation.inviter,
      } as any);
    }
  }

  await project.save();
  return { ok: true, message: 'OK' };
};

export const acceptInvitation = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { invitationId } = req.params as { invitationId: string };

  if (!ensureValidObjectId(invitationId, res, 'invitationId')) return res;

  const result = await updateInvitationStatus(
    userId,
    invitationId,
    'accepted',
  );
  if (!result.ok) {
    return res.status(400).json({ message: result.message });
  }
  return res.status(200).json({ message: 'Invitation accepted' });
};

export const rejectInvitation = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const userId = ensureAuth(req, res);
  if (!userId) return res;

  const { invitationId } = req.params as { invitationId: string };

  if (!ensureValidObjectId(invitationId, res, 'invitationId')) return res;

  const result = await updateInvitationStatus(
    userId,
    invitationId,
    'rejected',
  );
  if (!result.ok) {
    return res.status(400).json({ message: result.message });
  }
  return res.status(200).json({ message: 'Invitation rejected' });
};
