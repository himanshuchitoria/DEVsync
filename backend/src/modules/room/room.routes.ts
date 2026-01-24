// src/modules/room/room.routes.ts
import { Router } from 'express';
import { 
  createRoom, 
  listMyRooms, 
  getRoom,        // ✅ NEW - Fixes "Room not found"
  listProjects    // ✅ NEW - Fixes Projects 404
} from './room.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

export const roomRouter = Router();

// All room routes require authentication
roomRouter.use(authMiddleware);

// Create a new room; caller becomes owner
roomRouter.post('/', createRoom);

// List rooms where the caller is a member
roomRouter.get('/', listMyRooms);

// ✅ NEW: Get single room by ID (FIXES RoomPage "Room not found")
roomRouter.get('/:id', getRoom);

// ✅ NEW: List projects in room (FIXES RoomPage projects 404)
roomRouter.get('/:id/projects', listProjects);

export default roomRouter;
