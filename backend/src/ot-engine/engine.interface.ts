// src/ot-engine/engine.interface.ts
import type { Types } from 'mongoose';

/**
 * Canonical identifier type for documents inside the OT engine.
 * Engines should treat this as opaque and never rely on it being a string.
 */
export type EngineId = Types.ObjectId;

/**
 * Minimal shape of a collaborative document reference.
 * The engine works with DB-level IDs; socket / HTTP layers
 * are responsible for converting from string IDs to EngineId.
 */
export interface DocumentRef {
  projectId: EngineId;
  fileId: EngineId;
}

/**
 * Shape of an operation sent by clients into the engine.
 * The socket layer may wrap this in its own transport type;
 * once inside the engine, everything should conform to this interface.
 */
export interface ClientOperation<P = unknown> {
  /** Client‑known version at the time the op was created. */
  version: number;
  /** Logical user identifier for audit, conflict resolution, etc. */
  userId: string;
  /** OT/CRDT‑specific payload (delta, steps, etc.). */
  payload: P;
}

/**
 * Result of applying an operation on the server.
 */
export interface AppliedOperation<B = unknown> {
  /** New authoritative server version after applying this op. */
  version: number;

  /**
   * Optional full document snapshot after the operation.
   * Engines should only populate this when explicitly requested
   * (e.g. first join or periodic snapshot) to avoid large payloads.
   *
   * Socket / HTTP layers that require a string MUST normalize with
   * `const content = result.content ?? ''` or call `getSnapshot`.
   */
  content?: string;

  /**
   * OT/CRDT‑specific data to broadcast to other clients.
   * This is typically a transformed delta rather than the full content.
   */
  broadcastPayload: B;
}

/**
 * Generic interface that OT and CRDT engines must implement.
 * Higher layers (sockets, HTTP) depend on this abstraction,
 * not on specific algorithms or storage details.
 */
export interface DocumentEngine<
  P = unknown, // payload type for ClientOperation
  B = unknown  // payload type for AppliedOperation.broadcastPayload
> {
  /**
   * Ensure in‑memory state for this document (load from DB or create).
   * Idempotent: safe to call multiple times for the same doc.
   */
  hydrate(doc: DocumentRef): Promise<void>;

  /**
   * Get current document content from server‑truth state.
   * Always returns a string; engines must not return undefined here.
   */
  getSnapshot(doc: DocumentRef): Promise<string>;

  /**
   * Apply an operation from a client, transform/merge as needed,
   * update internal state, and return both the new version and
   * what should be broadcast to other clients.
   */
  applyOperation(
    doc: DocumentRef,
    op: ClientOperation<P>
  ): Promise<AppliedOperation<B>>;

  /**
   * Optional cleanup when a room/file is no longer active in memory.
   * Implementations may choose to be a no‑op if not needed.
   */
  dispose(doc: DocumentRef): Promise<void>;
}
