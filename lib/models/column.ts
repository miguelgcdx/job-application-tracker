/** Persists a board's column, its stored rank, and references to JobApplications. */
import mongoose, { Schema, Document } from "mongoose";

export interface IColumn extends Document {
  name: string;
  boardId: mongoose.Types.ObjectId;
  order: number;
  jobApplications: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Board -> Columns -> JobApplications

const ColumnSchema = new Schema<IColumn>(
  {
    name: {
      type: String,
      required: true,
    },
    // Supports board-scoped lookups, not authorization; callers must check ownership.
    boardId: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },
    // Stores rank only; domain/service logic owns the ordering policy.
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    jobApplications: [
      {
        type: Schema.Types.ObjectId,
        ref: "JobApplication",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Reuse the compiled model during development hot reload to avoid overwrite-model errors.
export default mongoose.models.Column ||
  mongoose.model<IColumn>("Column", ColumnSchema);
