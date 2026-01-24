// src/modules/room/room.model.ts
import { Schema, model, type Document, Types } from 'mongoose';

export type RoomRole = 'owner' | 'maintainer' | 'editor' | 'viewer' | 'guest';

export interface RoomMember {
  user: Types.ObjectId;    // ref to User
  role: RoomRole;
}

export interface RoomDocument extends Document {
  name: string;
  description?: string;
  members: RoomMember[];
  isTrusted: boolean;      // enables things like shared terminal later
  createdBy: Types.ObjectId; // User who created the room
  createdAt: Date;
  updatedAt: Date;
}

const roomMemberSchema = new Schema<RoomMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'maintainer', 'editor', 'viewer', 'guest'],
      required: true,
    },
  },
  { _id: false },
);

const roomSchema = new Schema<RoomDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    members: {
      type: [roomMemberSchema],
      default: [],
    },
    isTrusted: {
      type: Boolean,
      default: false, // only true for rooms where risky features are allowed
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Room = model<RoomDocument>('Room', roomSchema);
