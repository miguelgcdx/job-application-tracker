/**
 * Domain/service boundary: coordinates validation, ownership policy, ordering,
 * and repository transactions without depending on UI or navigation concerns.
 */
import {
  actorSchema, createJobSchema, objectIdSchema, updateJobSchema,
  type CreateJobInput, type UpdateJobInput,
} from "./schemas";

export const ERROR_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  PERSISTENCE_ERROR: "PERSISTENCE_ERROR",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type Result<T> = { ok: true; data: T } | { ok: false; code: ErrorCode };
export interface Job extends CreateJobInput {
  _id: string;
  status: string;
  order: number;
}
export interface OrderedJob { _id: string; order: number }

// All methods are scoped to the transaction's authenticated actor. Columns have
// no owner field: the service first authorizes their board or existing job.
export interface JobRepository {
  ownsBoard(boardId: string): Promise<boolean>;
  hasColumn(columnId: string, boardId: string): Promise<boolean>;
  findJob(id: string): Promise<Job | null>;
  listJobs(columnId: string, boardId: string): Promise<OrderedJob[]>;
  create(input: CreateJobInput, order: number): Promise<Job>;
  update(id: string, boardId: string, updates: UpdateJobInput): Promise<Job>;
  pull(columnId: string, boardId: string, id: string): Promise<void>;
  push(columnId: string, boardId: string, id: string): Promise<void>;
  delete(id: string, boardId: string): Promise<void>;
}
/**
 * Persistence contract: run work with an actor-scoped repository in one atomic
 * transaction. The store must roll back thrown failures; returning a domain
 * failure is a normal callback completion, not a rollback signal.
 */
export interface JobStore {
  transaction<T>(actorId: string, work: (repository: JobRepository) => Promise<T>): Promise<T>;
}
const failure = (code: ErrorCode): Result<never> => ({ ok: false, code });
const success = <T>(data: T): Result<T> => ({ ok: true, data });

/**
 * Builds UI-independent operations around an injected transactional store.
 * Callers supply a trusted, session-derived actor: Zod validates its shape, not
 * the session itself. Input parsing precedes persistence; ownership and ordering
 * decisions use repository reads inside the transaction before related writes.
 * Expected validation/access failures are results. Thrown operational failures
 * leave the callback first, then become PERSISTENCE_ERROR at this boundary.
 */
export function createJobService(store: JobStore) {
  async function execute<T>(actorId: string, work: (repository: JobRepository) => Promise<Result<T>>): Promise<Result<T>> {
    try {
      return await store.transaction(actorId, work);
    } catch {
      // Errors must escape the callback to abort before they become public results.
      return failure(ERROR_CODES.PERSISTENCE_ERROR);
    }
  }

  return {
    /** Creates a job at the column's end and adds its column reference atomically. */
    async create(actor: unknown, input: unknown): Promise<Result<Job>> {
      // Unknown boundary values must pass Zod before repository access. Valid IDs
      // identify requested resources; they are never evidence of ownership.
      const actorId = actorSchema.safeParse(actor);
      if (!actorId.success) return failure(ERROR_CODES.UNAUTHENTICATED);
      const parsed = createJobSchema.safeParse(input);
      if (!parsed.success) return failure(ERROR_CODES.INVALID_INPUT);
      return execute(actorId.data, async (repo) => {
        const data = parsed.data;
        // A new job cannot establish access: authorize the actor's board first,
        // then require the requested column to belong to that board.
        if (!await repo.ownsBoard(data.boardId) || !await repo.hasColumn(data.columnId, data.boardId)) {
          return failure(ERROR_CODES.NOT_FOUND);
        }
        const jobs = await repo.listJobs(data.columnId, data.boardId);
        // Ordered repository results supply the tail. Spacing by 100 keeps gaps
        // between stored ranks; create appends without renumbering existing jobs.
        const order = jobs.length ? jobs[jobs.length - 1].order + 100 : 0;
        const job = await repo.create(data, order);
        await repo.push(data.columnId, data.boardId, job._id);
        return success(job);
      });
    },

    /** Updates fields or moves/reorders an owned job within its existing board. */
    async update(actor: unknown, id: unknown, input: unknown): Promise<Result<Job>> {
      const actorId = actorSchema.safeParse(actor);
      if (!actorId.success) return failure(ERROR_CODES.UNAUTHENTICATED);
      const jobId = objectIdSchema.safeParse(id);
      const parsed = updateJobSchema.safeParse(input);
      if (!jobId.success || !parsed.success) return failure(ERROR_CODES.INVALID_INPUT);
      return execute(actorId.data, async (repo) => {
        // Actor-scoped lookup authorizes the existing job; use its stored board,
        // not a caller-supplied board, for every subsequent read and write.
        const job = await repo.findJob(jobId.data);
        if (!job) return failure(ERROR_CODES.NOT_FOUND);
        // Never mutate parsed input in a retryable transaction callback.
        const updates = { ...parsed.data };
        const target = updates.columnId ?? job.columnId;
        if (updates.columnId !== undefined || updates.order !== undefined) {
          // Both endpoints must belong to the authorized board, including the
          // source whose reference will be removed during a move.
          if (!await repo.hasColumn(target, job.boardId) || !await repo.hasColumn(job.columnId, job.boardId)) {
            return failure(ERROR_CODES.NOT_FOUND);
          }
          if (target !== job.columnId || updates.order !== undefined) {
            const others = (await repo.listJobs(target, job.boardId)).filter((item) => item._id !== job._id);
            // Input order is an insertion position, not a stored rank. Exclude
            // this job, clamp to the destination length, and default to append.
            const position = Math.min(updates.order ?? others.length, others.length);
            // Synchronize source/destination references even for a same-column
            // reorder. Sequential writes share the transaction with the final job
            // update, so references and the job's column/order commit together.
            await repo.pull(job.columnId, job.boardId, job._id);
            // Rebuild destination ranks in steps of 100, reserving one slot.
            // Cross-column moves leave source gaps intact; no compaction is needed.
            for (let index = 0; index < others.length; index++) {
              await repo.update(others[index]._id, job.boardId, { order: (index < position ? index : index + 1) * 100 });
            }
            await repo.push(target, job.boardId, job._id);
            updates.columnId = target;
            updates.order = position * 100;
          }
        }
        return success(await repo.update(job._id, job.boardId, updates));
      });
    },

    /** Removes an owned job and its column reference without compacting ranks. */
    async delete(actor: unknown, id: unknown): Promise<Result<true>> {
      const actorId = actorSchema.safeParse(actor);
      if (!actorId.success) return failure(ERROR_CODES.UNAUTHENTICATED);
      const jobId = objectIdSchema.safeParse(id);
      if (!jobId.success) return failure(ERROR_CODES.INVALID_INPUT);
      return execute(actorId.data, async (repo) => {
        const job = await repo.findJob(jobId.data);
        if (!job || !await repo.hasColumn(job.columnId, job.boardId)) return failure(ERROR_CODES.NOT_FOUND);
        // Verify the source column before writes, then remove the reference and
        // document together so a failed delete cannot leave a partial removal.
        await repo.pull(job.columnId, job.boardId, job._id);
        await repo.delete(job._id, job.boardId);
        return success(true);
      });
    },
  };
}
