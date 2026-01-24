// src/modules/room/room.controller.ts
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middlewares/authMiddleware';
import { Room } from './room.model';
import { User } from '../user/user.model';

export const createRoom = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { name, description } = req.body as { name?: string; description?: string };

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  const creator = await User.findById(req.user.sub);
  if (!creator) {
    return res.status(401).json({ message: 'Invalid user' });
  }

  const room = await Room.create({
    name,
    description,
    createdBy: creator._id,
    members: [
      {
        user: creator._id,
        role: 'owner',
      },
    ],
    isTrusted: false,
  });

  return res.status(201).json({
    room: {
      id: room._id.toString(), // ✅ Frontend expects string ID
      name: room.name,
      description: room.description,
      isTrusted: room.isTrusted,
      createdBy: room.createdBy.toString(),
      createdAt: room.createdAt,
    },
  });
};

export const listMyRooms = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const rooms = await Room.find({ 'members.user': req.user.sub }).lean();

  return res.status(200).json({
    rooms: rooms.map((room) => ({
      id: room._id.toString(), // ✅ Frontend expects string ID
      name: room.name,
      description: room.description,
      isTrusted: room.isTrusted,
    })),
  });
};

// ✅ NEW: GET /api/rooms/:id (FIXES "Room not found")
export const getRoom = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;

  const room = await Room.findOne({ 
    _id: id, 
    'members.user': req.user.sub // ✅ User must be member
  }).populate('createdBy', 'name email').lean();

  if (!room) {
    return res.status(404).json({ message: 'Room not found or access denied' });
  }

  return res.status(200).json({
    room: {
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      isTrusted: room.isTrusted,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      members: room.members?.length || 0,
    },
  });
};

// ✅ NEW: GET /api/rooms/:id/projects (FIXES Projects 404)
export const listProjects = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;

  // Check room access first
  const room = await Room.findOne({ 
    _id: id, 
    'members.user': req.user.sub 
  }).lean();

  if (!room) {
    return res.status(404).json({ message: 'Room not found or access denied' });
  }

  // Mock projects for now - replace with real Project model
  const projects = [
    {
      id: 'project-1',
      name: 'Frontend App',
      files: 5,
      createdAt: new Date(),
    },
    {
      id: 'project-2',
      name: 'Backend API',
      files: 3,
      createdAt: new Date(),
    },
  ];

  return res.status(200).json({
    projects,
  });
};
