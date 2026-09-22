/** Adapts domain service contracts to Mongoose queries and transactional persistence. */
import "server-only";

import mongoose, { type Model } from "mongoose";
import connectDB from "../db";
import { Board, Column, JobApplication } from "../models";
import type { IBoard } from "../models/board";
import type { IColumn } from "../models/column";
import type { IJobApplication } from "../models/job-application";
import type { Job, JobRepository, JobStore } from "./service";

const boards = Board as Model<IBoard>;
const columns = Column as Model<IColumn>;
const jobs = JobApplication as Model<IJobApplication>;

/** Return service-facing fields, stringify references, and normalize/copy the tags array. */
function toJob(doc: IJobApplication): Job {
  return {
    _id: String(doc._id),
    boardId: String(doc.boardId),
    columnId: String(doc.columnId),
    company: doc.company,
    position: doc.position,
    status: doc.status,
    order: doc.order,
    location: doc.location,
    notes: doc.notes,
    salary: doc.salary,
    jobUrl: doc.jobUrl,
    tags: doc.tags ? [...doc.tags] : [],
    description: doc.description,
  };
}

// A missing target aborts the transaction rather than silently leaving references inconsistent.
function requireMatch(matched: number) {
  if (matched !== 1) throw new Error("Mutation conflict");
}

/**
 * Each callback receives a repository bound to one session. Related job and column
 * writes commit or roll back together only when callers await them inside this callback.
 * MongoDB transactions require a replica set or sharded cluster, not a standalone server.
 */
export const jobStore: JobStore = {
  async transaction<T>(actorId: string, work: (repository: JobRepository) => Promise<T>): Promise<T> {
    await connectDB();
    // Explicitly propagate the session to every operation; the wrapper may retry work,
    // so callers must keep operations sequential and avoid irreversible external effects.
    return mongoose.connection.transaction(async (session) => {
      const repo: JobRepository = {
        // Board/job filters enforce actor ownership in the database: knowing an ID
        // is not authorization. Column operations instead depend on the service first
        // authorizing the board, then constrain the column to that board.
        async ownsBoard(boardId) {
          return Boolean(await boards.exists({ _id: boardId, userId: actorId }).session(session));
        },
        async hasColumn(columnId, boardId) {
          return Boolean(await columns.exists({ _id: columnId, boardId }).session(session));
        },
        async findJob(id) {
          const job = await jobs.findOne({ _id: id, userId: actorId }).session(session);
          return job ? toJob(job) : null;
        },
        // Stable rank/ID ordering supplies the service's ordering calculation. This
        // adapter does not renumber automatically: the service must await each order
        // update in this transaction. Atomic commit alone does not ensure unique ranks.
        async listJobs(columnId, boardId) {
          const found = await jobs.find({ columnId, boardId, userId: actorId })
            .select("_id order").sort({ order: 1, _id: 1 }).session(session).lean();
          return found.map((job) => ({ _id: String(job._id), order: job.order }));
        },
        // Board membership is recorded on the job; linking it into the column's
        // jobApplications array is a separate push. No Board document is changed here.
        async create(input, order) {
          const [job] = await jobs.create([{
            ...input, tags: input.tags ?? [], userId: actorId, status: "applied", order,
          }], { session });
          return toJob(job);
        },
        async update(id, boardId, updates) {
          const job = await jobs.findOneAndUpdate(
            { _id: id, boardId, userId: actorId },
            { $set: updates },
            { session, new: true, runValidators: true },
          );
          if (!job) throw new Error("Mutation conflict");
          return toJob(job);
        },
        // Reference maintenance is explicit: creation needs push; a move needs pull
        // from the old column, push to the new one, and an update to the job's columnId.
        // The shared session lets the service compose these without partial persistence.
        async pull(columnId, boardId, id) {
          const result = await columns.updateOne(
            { _id: columnId, boardId }, { $pull: { jobApplications: id } },
            { session, runValidators: true },
          );
          requireMatch(result.matchedCount);
        },
        async push(columnId, boardId, id) {
          const result = await columns.updateOne(
            { _id: columnId, boardId }, { $addToSet: { jobApplications: id } },
            { session, runValidators: true },
          );
          requireMatch(result.matchedCount);
        },
        // Deleting the job does not cascade: the service must also pull its column
        // reference within this transaction to avoid a dangling jobApplications entry.
        async delete(id, boardId) {
          const result = await jobs.deleteOne({ _id: id, boardId, userId: actorId }, { session });
          requireMatch(result.deletedCount);
        },
      };
      return work(repo);
    });
  },
};
