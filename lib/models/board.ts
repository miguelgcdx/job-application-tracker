/** Persists a user's board and its Column references, the root of the board graph. */
import mongoose, { Schema, Document } from "mongoose";

export interface IBoard extends Document {
  name: string;
  userId: string;
  columns: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BoardSchema = new Schema<IBoard>(
  {
    name: {
      type: String,
      required: true,
    },
    // Supports owner-scoped lookups; callers must still enforce authorization.
    userId: {
      type: String,
      required: true,
      index: true,
    },
    columns: [
      {
        type: Schema.Types.ObjectId,
        ref: "Column",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Reuse the compiled model during development hot reload to avoid overwrite-model errors.
export default mongoose.models.Board ||
  mongoose.model<IBoard>("Board", BoardSchema);
