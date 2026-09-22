/**
 * Provision the default job-hunt workspace for Better Auth's post-user-create hook.
 * This initializes application data; it does not authenticate or create the user.
 */
import connectDB from "./db";
import { Board, Column } from "./models";

// Zero-based ranks define the initial workflow order, independent of creation timing.
const DEFAULT_COLUMNS = [
  {
    name: "Wish List",
    order: 0,
  },
  { name: "Applied", order: 1 },
  { name: "Interviewing", order: 2 },
  { name: "Offer", order: 3 },
  { name: "Rejected", order: 4 },
];

/**
 * Return the user's existing "Job Hunt" board or create it with default columns.
 * The trusted caller supplies the newly created user's ID as the board owner.
 * Errors propagate to the caller; earlier successful writes are not rolled back.
 */
export async function initializeUserBoard(userId: string) {
  try {
    await connectDB();

    // This lookup avoids recreation on sequential calls, but is not an atomic
    // duplicate guard: concurrent calls can both pass it. An existing incomplete
    // board is returned without repair, so this is not guaranteed idempotent.
    const existingBoard = await Board.findOne({ userId, name: "Job Hunt" });

    if (existingBoard) {
      return existingBoard;
    }

    // There is no transaction or session here: board creation, column creation,
    // and reference saving commit separately. Atomic initialization would require
    // all three to succeed or fail together to prevent incomplete workspaces.
    // That requires a transaction-capable replica set or sharded deployment,
    // a shared session on every related write, and sequential transaction operations.
    const board = await Board.create({
      name: "Job Hunt",
      // Ownership lives on the board; each column links back through boardId.
      userId,
      columns: [],
    });

    const columns = await Promise.all(
      DEFAULT_COLUMNS.map((col) =>
        Column.create({
          name: col.name,
          order: col.order,
          boardId: board._id,
          jobApplication: [],
        })
      )
    );

    // Promise.all preserves input order, but a rejected creation does not undo
    // sibling writes. Saving these IDs completes the board-to-column references.
    board.columns = columns.map((col) => col._id);
    await board.save();

    return board;
  } catch (err) {
    throw err;
  }
}
