// src/ot-engine/otEngine.ts
import { Project } from '../modules/project/project.model';
import { logger } from '../config/logger';
import {
  type AppliedOperation,
  type ClientOperation,
  type DocumentEngine,
  type DocumentRef,
} from './engine.interface';

/**
 * Minimal OT-like engine:
 * - Full text replacement with versioning
 * - Defensive against legacy / missing documents
 * - Persists to MongoDB Project.files
 *
 * This is intentionally simple: each operation replaces the whole
 * file content. Later you can evolve `ClientOperation`/`AppliedOperation`
 * to carry structured OT / CRDT deltas without changing the socket API.
 */
class BasicOtEngine implements DocumentEngine {
  // In-memory version cache; replace with Redis or another shared store in production.
  private versions = new Map<string, number>();

  private key(doc: DocumentRef): string {
    return `${doc.projectId.toString()}:${doc.fileId.toString()}`;
  }

  /**
   * Ensure in-memory state is initialized for this document.
   * Idempotent: safe to call multiple times.
   */
  async hydrate(doc: DocumentRef): Promise<void> {
    const key = this.key(doc);
    if (this.versions.has(key)) return;

    const project = await Project.findById(doc.projectId).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    const file = (project.files || []).find(
      (f: any) => f._id?.toString() === doc.fileId.toString(),
    );
    if (!file) {
      throw new Error('File not found');
    }

    // Start version at 0 if not tracked. You could also persist
    // a version field on the file document for durability.
    this.versions.set(key, 0);

    logger.debug({ msg: 'Hydrated doc state', key });
  }

  /**
   * Get the current canonical content for a document.
   * Always returns a string.
   */
  async getSnapshot(doc: DocumentRef): Promise<string> {
    const project = await Project.findById(doc.projectId).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    const file = (project.files || []).find(
      (f: any) => f._id?.toString() === doc.fileId.toString(),
    );
    if (!file) {
      throw new Error('File not found');
    }

    return file.content ?? '';
  }

  /**
   * Apply a client operation.
   * For now this treats the payload as "new full text" and
   * replaces the file content atomically.
   */
  async applyOperation(
    doc: DocumentRef,
    op: ClientOperation,
  ): Promise<AppliedOperation> {
    const key = this.key(doc);
    const currentVersion = this.versions.get(key) ?? 0;

    // Soft check: allow out-of-sync versions but log for debugging.
    if (op.version !== currentVersion + 1) {
      logger.warn({
        msg: 'Version mismatch - applying anyway',
        key,
        expected: currentVersion + 1,
        clientVersion: op.version,
        userId: op.userId,
      });
    }

    // Normalize payload into a string snapshot.
    let newContent: string;
    const payload = op.payload as any;

    if (typeof payload === 'string') {
      newContent = payload;
    } else if (payload && typeof payload.content === 'string') {
      // Common case if the client sends { content: string, ... }
      newContent = payload.content;
    } else if (typeof payload === 'object') {
      // Fallback: serialize object payload.
      newContent = JSON.stringify(payload);
    } else {
      newContent = String(payload ?? '');
    }

    // Fetch and update the project/file.
    const project = await Project.findById(doc.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const fileIndex = (project.files || []).findIndex(
      (f: any) => f._id?.toString() === doc.fileId.toString(),
    );
    if (fileIndex === -1) {
      throw new Error('File not found');
    }

    // Defensive update: ensure the file entry exists and keep other fields.
    project.files[fileIndex] = {
      ...project.files[fileIndex],
      content: newContent,
    };

    await project.save();

    const newVersion = Math.max(currentVersion + 1, op.version);
    this.versions.set(key, newVersion);

    logger.debug({
      msg: 'Operation applied',
      key,
      version: newVersion,
      contentLength: newContent.length,
      userId: op.userId,
    });

    // For now broadcast the full text; later you can switch to real deltas.
    return {
      version: newVersion,
      content: newContent,
      broadcastPayload: {
        version: newVersion,
        content: newContent,
        userId: op.userId,
      },
    };
  }

  /**
   * Drop in-memory state for this document.
   * Call this when the last socket leaves its file room if you track that.
   */
  async dispose(doc: DocumentRef): Promise<void> {
    const key = this.key(doc);
    this.versions.delete(key);
  }
}

export const otEngine: DocumentEngine = new BasicOtEngine();
