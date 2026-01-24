// src/modules/project/project.model.ts
import { Schema, model, type Document, Types } from 'mongoose';

// ---------- Files embedded in project ----------

export interface ProjectFile {
  _id?: Types.ObjectId; // OPTIONAL for new files
  name: string;
  path: string; // e.g. "src/index.js"
  language: string; // e.g. "javascript", "python"
  content: string; // current server-truth content
}

const projectFileSchema = new Schema<ProjectFile>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
  },
  {
    _id: true, // Mongoose auto-generates _id
    timestamps: false, // Files don't need timestamps
  },
);

// ---------- Collaborators ----------

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectCollaborator {
  user: Types.ObjectId; // ref: User
  role: ProjectRole;
  invitedBy?: Types.ObjectId; // ref: User (who shared)
  createdAt?: Date;
}

const collaboratorSchema = new Schema<ProjectCollaborator>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      required: true,
      default: 'editor',
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// ---------- Invitations (pending access) ----------

export type ProjectInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

export interface ProjectInvitation {
  _id?: Types.ObjectId;
  project: Types.ObjectId; // self reference, helps querying
  room: Types.ObjectId; // room containing the project
  inviter: Types.ObjectId; // ref: User (who sent the invite)
  invitee: Types.ObjectId; // ref: User (who is invited)
  inviteeEmail?: string; // optional fallback if userId not known yet
  role: ProjectRole;
  status: ProjectInvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<ProjectInvitation>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    inviter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inviteeEmail: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      required: true,
      default: 'editor',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'revoked'],
      required: true,
      default: 'pending',
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

invitationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ---------- Project document ----------

export interface ProjectDocument extends Document {
  room: Types.ObjectId; // ref to Room
  name: string;
  owner: Types.ObjectId; // ref to User (creator)
  collaborators: ProjectCollaborator[];
  invitations: ProjectInvitation[]; // pending/ historical invitations
  files: ProjectFile[];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collaborators: {
      type: [collaboratorSchema],
      default: [],
    },
    invitations: {
      type: [invitationSchema],
      default: [],
    },
    files: {
      type: [projectFileSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Project gets createdAt/updatedAt
  },
);

// ---------- Indexes for performance ----------

// Query by room or owner.
projectSchema.index({ room: 1 });
projectSchema.index({ owner: 1 });

// Collaborator lookups (shared-with-me queries).
projectSchema.index({ 'collaborators.user': 1 });

// Fast lookup for a user's pending invitations.
projectSchema.index({ 'invitations.invitee': 1, 'invitations.status': 1 });

// Path-based file lookup for OT / file API.
projectSchema.index({ 'files.path': 1 });

export const Project = model<ProjectDocument>('Project', projectSchema);
